"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const leader = require("./topology_leader");
const intf = require("../topology_interfaces");
const log = require("../util/logger");
/** This class handles communication with topology coordination storage.
 */
class TopologyCoordinator {
    /** Simple constructor */
    constructor(name, storage, client) {
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
        async.whilst(() => {
            return self.is_running;
        }, (xcallback) => {
            async.parallel([
                (ycallback) => {
                    if (self.leadership.isRunning()) {
                        ycallback();
                    }
                    else {
                        self.is_running = false;
                        ycallback(new Error("Leadership object was stopped"));
                    }
                },
                (ycallback) => {
                    setTimeout(() => {
                        self.handleIncommingRequests(ycallback);
                    }, self.loop_timeout);
                },
                (ycallback) => {
                    if (++check_counter % 5 == 0) {
                        self.checkAssignedTopologies(ycallback);
                    }
                    else {
                        ycallback();
                    }
                }
            ], xcallback);
        }, (err) => {
            log.logger().important(self.log_prefix + "Coordinator stopped.");
            if (self.shutdown_callback) {
                self.shutdown_callback(err);
            }
            else {
                // This exit was not triggered from outside,
                // so notify the parent.
                self.client.shutdown(() => {
                    log.logger().important(this.log_prefix + "Exiting with code 0");
                    self.client.exit(0);
                });
            }
        });
    }
    /** Shut down the loop */
    preShutdown(callback) {
        let self = this;
        self.is_shutting_down = true;
        self.reportWorker(self.name, intf.Consts.WorkerStatus.closing, "", (err) => {
            if (err) {
                log.logger().error(self.log_prefix + "Error while reporting worker status as 'closing':");
                log.logger().exception(err);
            }
            self.leadership.shutdown((err) => {
                if (err) {
                    log.logger().error(self.log_prefix + "Error while shutting down leader:");
                    log.logger().exception(err);
                }
                callback();
            });
        });
    }
    /** Shut down the loop */
    shutdown(callback) {
        let self = this;
        log.logger().important(self.log_prefix + "Shutting down coordinator");
        self.reportWorker(self.name, intf.Consts.WorkerStatus.dead, "", (err) => {
            if (err) {
                log.logger().error(self.log_prefix + "Error while reporting worker status as 'dead':");
                log.logger().exception(err);
            }
            if (self.is_running) {
                self.shutdown_callback = callback;
                self.is_running = false;
            }
            else {
                callback();
            }
        });
    }
    /** Set status on given topology */
    reportTopology(uuid, status, error, callback) {
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
    /** Set pid on given topology */
    reportTopologyPid(uuid, pid, callback) {
        let self = this;
        this.storage.setTopologyPid(uuid, pid, (err) => {
            if (err) {
                log.logger().error(self.log_prefix + "Couldn't report topology pid");
                log.logger().error(self.log_prefix + `Topology: ${uuid}, pid=${pid}`);
                log.logger().exception(err);
            }
            if (callback) {
                callback(err);
            }
        });
    }
    /** Set status on given worker */
    reportWorker(name, status, error, callback) {
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
    /** This method checks for new messages from coordination storage.
     * TODO1: start topologies (parallel)
     * TODO2: stop topologies (parallel)
     */
    handleIncommingRequests(callback) {
        let self = this;
        if (self.is_shutting_down) {
            return callback();
        }
        self.storage.getMessage(self.name, (err, msg) => {
            if (err) {
                return callback(err);
            }
            if (!msg) {
                return callback();
            }
            if (msg.created < self.start_time) {
                // just ignore, it was sent before this coordinator was started
                return callback();
            }
            else if (msg.cmd === intf.Consts.LeaderMessages.start_topology) {
                self.storage.getTopologyInfo(msg.content.uuid, (err, res) => {
                    if (err) {
                        return callback(err);
                    }
                    if (self.name == res.worker) {
                        // topology is still assigned to this worker
                        // otherwise the message could be old and stale, the toplogy was re-assigned to another worker
                        self.client.startTopology(msg.content.uuid, res.config, callback);
                    }
                    else {
                        return callback();
                    }
                });
            }
            else if (msg.cmd === intf.Consts.LeaderMessages.stop_topology) {
                self.client.stopTopology(msg.content.uuid, () => {
                    // TODO: make sure that assignTopologyToWorker can be called 
                    // when a shutdown errors (topology reported status error)
                    if (msg.content.new_worker) {
                        // ok, we got an instruction to explicitly re-assign topology to new worker
                        self.leadership.assignTopologyToWorker(msg.content.new_worker, msg.content.uuid, callback);
                    }
                    else {
                        return callback();
                    }
                });
            }
            else if (msg.cmd === intf.Consts.LeaderMessages.kill_topology) {
                self.client.killTopology(msg.content.uuid, callback);
            }
            else if (msg.cmd === intf.Consts.LeaderMessages.shutdown) {
                // shutdown only logs exceptions
                self.client.shutdown(() => {
                    // do not call callback() - we're exiting
                    log.logger().important(this.log_prefix + "Exiting with code 0");
                    self.client.exit(0);
                });
            }
            else if (msg.cmd === intf.Consts.LeaderMessages.rebalance) {
                self.leadership.forceRebalance();
                return callback();
            }
            else {
                // unknown message
                return callback();
            }
        });
    }
    /** This method checks if all topologies, assigned to this worker, actually run. */
    checkAssignedTopologies(callback) {
        let self = this;
        self.storage.getTopologiesForWorker(self.name, (err, topologies) => {
            if (err)
                return callback(err);
            let topologies_running = topologies
                .filter(x => x.status == intf.Consts.TopologyStatus.running)
                .map(x => x.uuid);
            self.client.resolveTopologyMismatches(topologies_running, callback);
        });
    }
}
exports.TopologyCoordinator = TopologyCoordinator;
//# sourceMappingURL=topology_coordinator.js.map