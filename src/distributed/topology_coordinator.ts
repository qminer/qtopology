import * as async from "async";
import * as leader from "./topology_leader";
import * as EventEmitter from "events";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

/** Interface for objects that coordinator needs to communicate with. */
export interface TopologyCoordinatorClient {
    /** Obejct needs to start given topology */
    startTopology(uuid: string, config: any, callback: intf.SimpleCallback);
    /** Object needs to stop given topology */
    stopTopology(uuid: string, callback: intf.SimpleCallback);
    /** Object should verify that the given topology is running. */
    verifyTopology(uuid: string, callback: intf.SimpleCallback);
    /** Object should shut down */
    shutdown();
}

/** This class handles communication with topology coordination storage.
 */
export class TopologyCoordinator extends EventEmitter {

    private storage: intf.CoordinationStorage;
    private client: TopologyCoordinatorClient;
    private name: string;
    private is_shutting_down: boolean;
    private is_running: boolean;
    private shutdown_callback: intf.SimpleCallback;
    private loop_timeout: number;
    private leadership: leader.TopologyLeader;
    private start_time: Date;
    private log_prefix: string;

    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage, client: TopologyCoordinatorClient) {
        super();
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
    }

    /** Runs main loop */
    run() {
        let self = this;
        self.is_running = true;
        self.storage.registerWorker(self.name, () => { });
        self.leadership.run();

        let check_counter = 0;
        async.whilst(
            () => {
                return self.is_running;
            },
            (xcallback) => {
                async.parallel(
                    [
                        (ycallback) => {
                            setTimeout(() => {
                                self.handleIncommingRequests(ycallback);
                            }, self.loop_timeout);
                        },
                        (ycallback) => {
                            if (++check_counter % 5 == 0) {
                                self.checkAssignedTopologies(ycallback);
                            } else {
                                ycallback();
                            }
                        }
                    ],
                    xcallback
                );
            },
            (err) => {
                log.logger().important(self.log_prefix + "Coordinator shut down.");
                if (self.shutdown_callback) {
                    self.shutdown_callback(err);
                }
            }
        );
    }

    /** Shut down the loop */
    preShutdown(callback: intf.SimpleCallback) {
        let self = this;
        self.is_shutting_down = true;
        self.reportWorker(self.name, intf.Consts.WorkerStatus.closing, "", (err: Error) => {
            if (err) {
                log.logger().error(self.log_prefix + "Error while reporting worker status as 'closing':");
                log.logger().exception(err);
            }
            self.leadership.shutdown((err: Error) => {
                if (err) {
                    log.logger().error(self.log_prefix + "Error while shutting down leader:");
                    log.logger().exception(err);
                }
                callback();
            });
        });
    }


    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        self.reportWorker(self.name, intf.Consts.WorkerStatus.dead, "", (err) => {
            if (err) {
                log.logger().error(self.log_prefix + "Error while reporting worker status as 'dead':");
                log.logger().exception(err);
            }
            self.shutdown_callback = callback;
            self.is_running = false;
        });
    }

    /** Set status on given topology */
    reportTopology(uuid: string, status: string, error: string, callback?: intf.SimpleCallback) {
        let self = this;
        this.storage.setTopologyStatus(uuid, status, error, (err) => {
            if (err) {
                log.logger().error(self.log_prefix + "Couldn't report topology status");
                log.logger().error(self.log_prefix + `Topology: ${uuid}, status=${status}, error=${error}`);
                log.logger().exception(err);
            }
            if (callback) {
                callback(err);
            }
        });
    }

    /** Set status on given worker */
    reportWorker(name: string, status: string, error: string, callback?: intf.SimpleCallback) {
        let self = this;
        this.storage.setWorkerStatus(name, status, (err) => {
            if (err) {
                log.logger().error(self.log_prefix + "Couldn't report worker status");
                log.logger().error(self.log_prefix + `Worker: name=${name}, status=${status}`);
                log.logger().exception(err);
            }
            if (callback) {
                callback(err);
            }
        });
    }

    /** This method checks for new messages from coordination storage. */
    private handleIncommingRequests(callback: intf.SimpleCallback) {
        let self = this;
        if (self.is_shutting_down) {
            return callback();
        }
        self.storage.getMessages(self.name, (err, msgs) => {
            if (err) return callback(err);
            async.each(
                msgs,
                (msg: intf.StorageResultMessage, xcallback) => {
                    if (msg.created < self.start_time) {
                        // just ignore, it was sent before this coordinator was started
                    } else if (msg.cmd === intf.Consts.LeaderMessages.start_topology) {
                        self.storage.getTopologyInfo(msg.content.uuid, (err, res) => {
                            if (self.name == res.worker) {
                                // topology is still assigned to this worker
                                // otherwise the message could be old and stale, the toplogy was re-assigned to another worker
                                self.client.startTopology(msg.content.uuid, res.config, xcallback);
                            }
                        })
                    } else if (msg.cmd === intf.Consts.LeaderMessages.stop_topology) {
                        self.client.stopTopology(msg.content.uuid, (err)=>{
                            if (err) return xcallback(err);
                            if (msg.content.new_worker) {
                                // topology has been "re-assigned" - nwe worker should pick it up
                                self.storage.sendMessageToWorker(msg.content.new_worker, intf.Consts.LeaderMessages.start_topology, {}, xcallback);
                            } else {
                                xcallback();
                            }
                        });
                    } else if (msg.cmd === intf.Consts.LeaderMessages.shutdown) {
                        self.client.shutdown();
                        xcallback();
                    } else if (msg.cmd === intf.Consts.LeaderMessages.rebalance) {
                        self.leadership.forceRebalance();
                        xcallback();
                    } else {
                        // unknown message
                        xcallback();
                    }
                },
                callback
            );
        });
    }

    /** This method checks if all topologies, assigned to this worker, actually run. */
    private checkAssignedTopologies(callback: intf.SimpleCallback) {
        let self = this;
        self.storage.getTopologiesForWorker(self.name, (err, topologies) => {
            if (err) return callback(err);
            async.each(
                topologies,
                (top, xcallback) => {
                    if (top.status == intf.Consts.TopologyStatus.running) {
                        self.client.verifyTopology(top.uuid, xcallback);
                    } else {
                        xcallback();
                    }
                },
                callback);
        });
    }
}
