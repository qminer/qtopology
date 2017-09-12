"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const lb = require("../util/load_balance");
const intf = require("../topology_interfaces");
const log = require("../util/logger");
/** This class handles leader-status determination and
 * performs leadership tasks if marked as leader.
 */
class TopologyLeader {
    /** Simple constructor */
    constructor(name, storage, loop_timeout) {
        this.storage = storage;
        this.name = name;
        this.is_running = false;
        this.shutdown_callback = null;
        this.is_leader = false;
        this.is_shut_down = false;
        this.loop_timeout = loop_timeout || 3 * 1000; // 3 seconds for refresh
    }
    /** Runs main loop that handles leadership detection */
    run() {
        let self = this;
        self.is_shut_down = false;
        self.is_running = true;
        async.whilst(() => {
            return self.is_running;
        }, (xcallback) => {
            setTimeout(() => {
                if (self.is_leader) {
                    self.performLeaderLoop(xcallback);
                }
                else {
                    self.checkIfLeaderDetermined(xcallback);
                }
            }, self.loop_timeout);
        }, (err) => {
            log.logger().important("[Leader] Leader shutdown finished.");
            self.is_shut_down = true;
            self.is_running = false;
            if (self.shutdown_callback) {
                self.shutdown_callback(err);
            }
        });
    }
    /** Shut down the loop */
    shutdown(callback) {
        let self = this;
        if (self.is_shut_down) {
            callback();
        }
        else {
            self.shutdown_callback = callback;
            self.is_running = false;
        }
    }
    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    checkIfLeaderDetermined(callback) {
        let self = this;
        let should_announce = true;
        async.series([
            (xcallback) => {
                self.storage.getLeadershipStatus((err, res) => {
                    if (err)
                        return callback(err);
                    if (res.leadership == intf.Consts.LeadershipStatus.ok) {
                        should_announce = false;
                    }
                    xcallback();
                });
            },
            (xcallback) => {
                if (!should_announce)
                    return xcallback();
                self.storage.announceLeaderCandidacy(self.name, xcallback);
            },
            (xcallback) => {
                if (!should_announce)
                    return xcallback();
                self.storage.checkLeaderCandidacy(self.name, (err, is_leader) => {
                    if (err)
                        return xcallback(err);
                    self.is_leader = is_leader;
                    if (self.is_leader) {
                        log.logger().important("[Leader] This worker became a leader...");
                        self.performLeaderLoop(xcallback);
                    }
                    else {
                        xcallback();
                    }
                });
            }
        ], callback());
    }
    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    performLeaderLoop(callback) {
        let self = this;
        let perform_loop = true;
        let alive_workers = null;
        let worker_weights = new Map();
        async.series([
            (xcallback) => {
                self.storage.getWorkerStatus((err, workers) => {
                    if (err)
                        return xcallback(err);
                    let this_worker_lstatus = workers
                        .filter(x => x.name === self.name)
                        .map(x => x.lstatus)[0];
                    if (this_worker_lstatus != intf.Consts.WorkerLStatus.leader) {
                        perform_loop = false;
                        return xcallback();
                    }
                    let dead_workers = workers
                        .filter(x => x.status === intf.Consts.WorkerStatus.dead)
                        .map(x => x.name);
                    alive_workers = workers
                        .filter(x => x.status === intf.Consts.WorkerStatus.alive);
                    if (alive_workers.length == 0) {
                        return xcallback();
                    }
                    async.each(dead_workers, (dead_worker, ycallback) => {
                        self.handleDeadWorker(dead_worker, ycallback);
                    }, xcallback);
                });
            },
            (xcallback) => {
                if (!perform_loop || alive_workers.length == 0) {
                    return xcallback();
                }
                self.storage.getTopologyStatus((err, topologies) => {
                    if (err)
                        return xcallback(err);
                    topologies = topologies.filter(x => x.enabled);
                    topologies.forEach(x => {
                        x.weight = x.weight || 1;
                        x.worker_affinity = x.worker_affinity || [];
                        if (x.status == "" || x.status == intf.Consts.TopologyStatus.unassigned) {
                            for (let worker of alive_workers) {
                                let name = worker.name;
                                if (name == x.worker) {
                                    let old_weight = 0;
                                    if (worker_weights.has(name)) {
                                        old_weight = worker_weights.get(name);
                                    }
                                    worker_weights.set(name, old_weight + x.weight);
                                    break;
                                }
                            }
                        }
                    });
                    let unassigned_topologies = topologies
                        .filter(x => x.status === intf.Consts.TopologyStatus.unassigned);
                    if (unassigned_topologies.length > 0) {
                        log.logger().log("[Leader] Found unassigned topologies: " + JSON.stringify(unassigned_topologies));
                    }
                    let load_balancer = new lb.LoadBalancerEx(alive_workers.map(x => {
                        return { name: x.name, weight: worker_weights.get(x.name) || 0 };
                    }), 5 // affinity means 5x stronger gravitational pull towards that worker
                    );
                    async.eachSeries(unassigned_topologies, (item, ycallback) => {
                        let ut = item;
                        self.assignUnassignedTopology(ut, load_balancer, ycallback);
                    }, xcallback);
                });
            }
        ], callback);
    }
    /**
     * This method assigns topology to the worker that is provided by the load-balancer.
     * @param ut - unassigned toplogy object
     * @param load_balancer - load balancer object that tells you which worker to send the topology to
     * @param callback - callback to call when done
     */
    assignUnassignedTopology(ut, load_balancer, callback) {
        let self = this;
        let target = load_balancer.next(ut.worker_affinity, ut.weight);
        log.logger().log(`[Leader] Assigning topology ${ut.uuid} to worker ${target}`);
        self.storage.assignTopology(ut.uuid, target, (err) => {
            self.storage.sendMessageToWorker(target, intf.Consts.LeaderMessages.start_topology, { uuid: ut.uuid }, callback);
        });
    }
    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    handleDeadWorker(dead_worker, callback) {
        log.logger().important("[Leader] Handling dead worker " + dead_worker);
        let self = this;
        self.storage.getTopologiesForWorker(dead_worker, (err, topologies) => {
            async.each(topologies, (topology, xcallback) => {
                log.logger().important("[Leader] Unassigning topology " + topology.uuid);
                self.storage.setTopologyStatus(topology.uuid, intf.Consts.TopologyStatus.unassigned, null, xcallback);
            }, (err) => {
                if (err) {
                    log.logger().important("[Leader] Error while handling dead worker " + err);
                    return callback(err);
                }
                log.logger().important("[Leader] Setting dead worker as unloaded: " + dead_worker);
                self.storage.setWorkerStatus(dead_worker, intf.Consts.WorkerStatus.unloaded, callback);
            });
        });
    }
}
exports.TopologyLeader = TopologyLeader;
//# sourceMappingURL=topology_leader.js.map