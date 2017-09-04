import * as async from "async";
import * as leader from "./topology_leader";
import * as EventEmitter from "events";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

/** This class handles communication with topology coordination storage.
 */
export class TopologyCoordinator extends EventEmitter {

    private storage: intf.CoordinationStorage;
    private name: string;
    private is_shutting_down: boolean;
    private is_running: boolean;
    private shutdown_callback: intf.SimpleCallback;
    private loop_timeout: number;
    private leadership: leader.TopologyLeader;
    private start_time: Date;

    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage) {
        super();
        this.storage = storage;
        this.name = name;
        this.leadership = new leader.TopologyLeader(this.name, this.storage, null);
        this.is_running = false;
        this.is_shutting_down = false;
        this.shutdown_callback = null;
        this.loop_timeout = 2 * 1000; // 2 seconds for refresh
        this.start_time = new Date();
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
                log.logger().important("[Coordinator] Coordinator shut down.");
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
                log.logger().error("Error while reporting worker status as 'closing':");
                log.logger().exception(err);
            }
            self.leadership.shutdown((err: Error) => {
                if (err) {
                    log.logger().error("Error while shutting down leader:");
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
                log.logger().error("Error while reporting worker status as 'dead':");
                log.logger().exception(err);
            }
            self.shutdown_callback = callback;
            self.is_running = false;
        });
    }

    /** Set status on given topology */
    reportTopology(uuid: string, status: string, error: string, callback?: intf.SimpleCallback) {
        this.storage.setTopologyStatus(uuid, status, error, (err) => {
            if (err) {
                log.logger().error("[Coordinator] Couldn't report topology status");
                log.logger().error(`Topology: ${uuid}, status=${status}, error=${error}`);
                log.logger().exception(err);
            }
            if (callback) {
                callback(err);
            }
        });
    }

    /** Set status on given worker */
    reportWorker(name: string, status: string, error: string, callback?: intf.SimpleCallback) {
        this.storage.setWorkerStatus(name, status, (err) => {
            if (err) {
                log.logger().error("[Coordinator] Couldn't report worker status");
                log.logger().error(`Worker: name=${name}, status=${status}`);
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
                    } else if (msg.cmd === "start-topology") {
                        self.storage.getTopologyInfo(msg.content.uuid, (err, res) => {
                            if (self.name == res.worker) {
                                // topology is still assigned to this worker
                                // otherwise the message could be old and stale, the toplogy was re-assigned to another worker
                                self.emit("start-topology", { uuid: msg.content.uuid, config: res.config });
                            }
                        })
                    } else if (msg.cmd === "stop-topology") {
                        self.emit("stop-topology", { uuid: msg.content.uuid });
                    } else if (msg.cmd === "shutdown") {
                        self.emit("shutdown", {});
                    }
                    xcallback();
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
            for (let top of topologies) {
                if (top.status == intf.Consts.TopologyStatus.running) {
                    self.emit("verify-topology", { uuid: top.uuid });
                }
            }
            callback();
        });
    }
}
