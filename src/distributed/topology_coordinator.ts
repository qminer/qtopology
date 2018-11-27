import * as async from "async";
import * as leader from "./topology_leader";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

const MAX_ERR_MSG_LENGTH: number = 1000;

/** Interface for objects that coordinator needs to communicate with. */
export interface ITopologyCoordinatorClient {
    /** Object needs to start given topology */
    startTopology(uuid: string, config: any, callback: intf.SimpleCallback): void;
    /** Object needs to stop given topology */
    stopTopology(uuid: string, callback: intf.SimpleCallback): void;
    /** Object should stop all topologies */
    stopAllTopologies(callback: intf.SimpleCallback): void;
    /** Object needs to kill given topology */
    killTopology(uuid: string, callback: intf.SimpleCallback): void;
    /** Object should resolve differences between running topologies and the given list. */
    resolveTopologyMismatches(uuids: string[], callback: intf.SimpleCallback): void;
    /** Object should shut down */
    shutdown(callback: intf.SimpleCallback): void;
    /** Process exit wrapper */
    exit(code: number): void;
    /** Check if current time is in dormancy period */
    is_dormant_period(): boolean;
}

/** This class handles communication with topology coordination storage.
 */
export class TopologyCoordinator {

    private storage: intf.ICoordinationStorage;
    private client: ITopologyCoordinatorClient;
    private name: string;
    private is_shutting_down: boolean;
    private is_running: boolean;
    private shutdown_callback: intf.SimpleCallback;
    private loop_timeout: number;
    private leadership: leader.TopologyLeader;
    private start_time: Date;
    private log_prefix: string;
    private pingIntervalId: NodeJS.Timer;
    private pingInterval: number;
    private current_dormancy_state: boolean;

    /** Simple constructor */
    constructor(name: string, storage: intf.ICoordinationStorage, client: ITopologyCoordinatorClient) {
        this.storage = storage;
        this.client = client;
        this.name = name;
        this.leadership = new leader.TopologyLeader(this.name, this.storage, null);
        this.is_running = false;
        this.is_shutting_down = false;
        this.shutdown_callback = null;
        this.loop_timeout = 2 * 1000; // 2 seconds for refresh
        this.start_time = new Date();
        this.log_prefix = "[Coordinator] ";
        this.pingIntervalId = null;
        this.pingInterval = 1000;
        this.current_dormancy_state = false;
    }

    /** Runs main loop */
    public run() {
        this.is_running = true;
        this.storage.registerWorker(this.name, () => {
            this.setPingInterval();
        });
        this.leadership.run();

        let check_counter = 0;
        async.whilst(
            () => {
                return this.is_running;
            },
            xcallback => {
                async.parallel(
                    [
                        ycallback => {
                            if (this.leadership.isRunning()) {
                                ycallback();
                            } else {
                                this.is_running = false;
                                ycallback(new Error("Leadership object was stopped"));
                            }
                        },
                        ycallback => {
                            setTimeout(() => {
                                this.handleIncommingRequests(ycallback);
                            }, this.loop_timeout);
                        },
                        ycallback => {
                            if (++check_counter % 5 == 1) {
                                this.checkAssignedTopologies(ycallback);
                            } else {
                                ycallback();
                            }
                        },
                        ycallback => {
                            if (++check_counter % 5 == 0) {
                                this.checkWorkerStatus(ycallback);
                            } else {
                                ycallback();
                            }
                        }
                    ],
                    xcallback
                );
            },
            (err: Error) => {
                log.logger().important(this.log_prefix + "Coordinator stopped.");
                if (this.shutdown_callback) {
                    this.shutdown_callback(err);
                } else {
                    // This exit was not triggered from outside,
                    // so notify the parent.
                    this.client.shutdown(() => {
                        log.logger().important(this.log_prefix + "Exiting with code 0");
                        this.client.exit(0);
                    });
                }
            }
        );
    }

    /** Shut down the loop */
    public preShutdown(callback: intf.SimpleCallback) {
        this.is_shutting_down = true;
        this.reportWorker(this.name, intf.CONSTS.WorkerStatus.closing, (err: Error) => {
            if (err) {
                log.logger().error(this.log_prefix + "Error while reporting worker status as 'closing':");
                log.logger().exception(err);
            }
            this.leadership.shutdown((err_inner: Error) => {
                if (err_inner) {
                    log.logger().error(this.log_prefix + "Error while shutting down leader:");
                    log.logger().exception(err_inner);
                }
                callback();
            });
        });
    }

    /** This method marks this worker as disabled. */
    public setAsDisabled(callback: intf.SimpleCallback) {
        this.reportWorker(this.name, intf.CONSTS.WorkerStatus.disabled, callback);
    }


    /** Shut down the loop */
    public shutdown(callback: intf.SimpleCallback) {
        log.logger().important(this.log_prefix + "Shutting down coordinator");
        // TODO check what happens when a topology is waiting
        this.reportWorker(this.name, intf.CONSTS.WorkerStatus.dead, err => {
            clearInterval(this.pingIntervalId);
            if (err) {
                log.logger().error(this.log_prefix + "Error while reporting worker status as 'dead':");
                log.logger().exception(err);
            }
            if (this.is_running) {
                this.shutdown_callback = callback;
                this.is_running = false;
            } else {
                callback();
            }
        });
    }

    /** Set status on given topology */
    public reportTopology(uuid: string, status: string, error: string, callback?: intf.SimpleCallback) {
        if (error.length > MAX_ERR_MSG_LENGTH) {
            error = error.substring(0, MAX_ERR_MSG_LENGTH);
        }
        this.storage.setTopologyStatus(uuid, this.name, status, error, err => {
            if (err) {
                log.logger().error(this.log_prefix + "Couldn't report topology status");
                log.logger().error(this.log_prefix + `Topology: ${uuid}, status=${status}, error=${error}`);
                log.logger().exception(err);
            }
            if (callback) {
                callback(err);
            }
        });
    }
    /** Set pid on given topology */
    public reportTopologyPid(uuid: string, pid: number, callback?: intf.SimpleCallback) {
        this.storage.setTopologyPid(uuid, pid, err => {
            if (err) {
                log.logger().error(this.log_prefix + "Couldn't report topology pid");
                log.logger().error(this.log_prefix + `Topology: ${uuid}, pid=${pid}`);
                log.logger().exception(err);
            }
            if (callback) {
                callback(err);
            }
        });
    }

    /** Set status on given worker */
    public reportWorker(name: string, status: string, callback?: intf.SimpleCallback) {
        this.storage.setWorkerStatus(name, status, err => {
            if (err) {
                log.logger().error(this.log_prefix + "Couldn't report worker status");
                log.logger().error(this.log_prefix + `Worker: name=${name}, status=${status}`);
                log.logger().exception(err);
            }
            if (callback) {
                callback(err);
            }
        });
    }

    /** Handle single request */
    private handleSingleRequest(msg: intf.IStorageResultMessage, callback: intf.SimpleCallback) {
        const simple_callback = ((err: Error) => {
            if (err) {
                log.logger().exception(err);
            }
        });
        if (msg.created < this.start_time) {
            // just ignore, it was sent before this coordinator was started
            return callback();
        } else if (msg.cmd === intf.CONSTS.LeaderMessages.start_topology) {
            this.storage.getTopologyInfo(msg.content.uuid, (err, res) => {
                if (err) { return callback(err); }
                if (this.name == res.worker && res.status == intf.CONSTS.TopologyStatus.waiting) {
                    // topology is still assigned to this worker
                    // otherwise the message could be old and stale, the toplogy was re-assigned to another worker
                    this.client.startTopology(msg.content.uuid, res.config, simple_callback);
                    callback();
                } else {
                    return callback();
                }
            });
        } else if (msg.cmd === intf.CONSTS.LeaderMessages.start_topologies) {
            async.each(msg.content.uuids, (uuid: string, xcallback) => {
                this.handleSingleRequest(
                    {
                        cmd: intf.CONSTS.LeaderMessages.start_topology,
                        content: { uuid },
                        created: new Date()
                    }, xcallback);
            }, (err: Error) => {
                return callback(err);
            });
        } else if (msg.cmd === intf.CONSTS.LeaderMessages.stop_topology) {
            this.client.stopTopology(msg.content.uuid, simple_callback);
            callback();
        } else if (msg.cmd === intf.CONSTS.LeaderMessages.set_disabled) {
            log.logger().important("Setting worker as disabled: " + this.name);
            this.leadership.releaseLeadership((err: Error) => {
                if (err) {
                    return simple_callback(err);
                }
                this.reportWorker(this.name, intf.CONSTS.WorkerStatus.disabled, (err_inner: Error) => {
                    if (err_inner) {
                        return simple_callback(err_inner);
                    }
                    this.client.stopAllTopologies(simple_callback);
                });
            });
            callback();
        } else if (msg.cmd === intf.CONSTS.LeaderMessages.set_enabled) {
            log.logger().important("Setting worker as enabled: " + this.name);
            this.reportWorker(this.name, intf.CONSTS.WorkerStatus.alive, simple_callback);
            callback();
        } else if (msg.cmd === intf.CONSTS.LeaderMessages.stop_topologies) {
            async.each(msg.content.stop_topologies,
                (stop_topology: any, xcallback) => {
                    this.client.stopTopology(stop_topology.uuid, simple_callback);
                    xcallback();
                }, callback);
        } else if (msg.cmd === intf.CONSTS.LeaderMessages.kill_topology) {
            this.client.killTopology(msg.content.uuid, simple_callback);
            callback();
        } else if (msg.cmd === intf.CONSTS.LeaderMessages.shutdown) {
            // shutdown only logs exceptions
            this.client.shutdown(() => {
                log.logger().important(this.log_prefix + "Exiting with code 0");
                this.client.exit(0);
            });
            return callback();
        } else if (msg.cmd === intf.CONSTS.LeaderMessages.rebalance) {
            this.leadership.forceRebalance();
            return callback();
        } else {
            // unknown message
            return callback();
        }
    }

    /** This method checks for new messages from coordination storage. */
    private handleIncommingRequests(callback: intf.SimpleCallback) {
        if (this.is_shutting_down) {
            return callback();
        }
        this.storage.getMessage(this.name, (err, msg) => {
            if (err) {
                return callback(err);
            }
            if (!msg) {
                const new_dormancy_state = this.client.is_dormant_period();
                if (new_dormancy_state != this.current_dormancy_state) {
                    this.current_dormancy_state = new_dormancy_state;
                    // dormancy state changed, create new message and send into handler
                    msg = {
                        cmd: (new_dormancy_state ?
                            intf.CONSTS.LeaderMessages.set_disabled :
                            intf.CONSTS.LeaderMessages.set_enabled),
                        content: {},
                        created: new Date()
                    };
                } else {
                    return callback();
                }
            }
            this.handleSingleRequest(msg, callback);
        });
    }

    /** This method checks current status for this worker.
     * It might happen that leader marked it as dead (e.g. pings were not
     * comming into db for some time), but this worker is actually still alive.
     * The worker must announce that it is available. The leader will then
     * handle the topologies appropriatelly.
     */
    private checkWorkerStatus(callback: intf.SimpleCallback) {
        this.storage.getWorkerStatus((err, workers) => {
            if (err) {
                return callback(err);
            }
            const curr_status = workers
                .filter(x => x.name == this.name)
                .map(x => x.status);
            if (curr_status.length == 0) {
                // current worker doesn't have a record
                this.storage.registerWorker(this.name, callback);
            } else if (
                curr_status[0] != intf.CONSTS.WorkerStatus.alive &&
                curr_status[0] != intf.CONSTS.WorkerStatus.disabled
            ) {
                // state was set to something else, but this worker is still running
                this.storage.setWorkerStatus(this.name, intf.CONSTS.WorkerStatus.alive, callback);
            } else {
                callback();
            }
        });
    }

    /** This method checks if all topologies, assigned to this worker, actually run. */
    // TODO assert PIDs
    private checkAssignedTopologies(callback: intf.SimpleCallback) {
        this.storage.getTopologiesForWorker(this.name, (err, topologies) => {
            if (err) {
                return callback(err);
            }
            const topologies_running = topologies
                .filter(x => x.status == intf.CONSTS.TopologyStatus.running)
                .map(x => x.uuid);

            this.client.resolveTopologyMismatches(topologies_running, callback);
        });
    }

    private setPingInterval() {
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
        }
        // send ping to child in regular intervals
        this.pingIntervalId = setInterval(
            () => {
                this.storage.pingWorker(this.name, err => {
                    if (err) {
                        log.logger().error(this.log_prefix + "Error while sending worker ping:");
                        log.logger().exception(err);
                    }
                });
            },
            this.pingInterval);
    }
}
