
import * as async from "async";
import * as lb from "../util/load_balance";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger"

/** This class handles leader-status determination and
 * performs leadership tasks if marked as leader.
 */
export class TopologyLeader {

    private storage: intf.CoordinationStorage;
    private name: string;
    private isRunning: boolean;
    private isLeader: boolean;
    private shutdownCallback: intf.SimpleCallback;
    private loopTimeout: number;

    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage) {
        this.storage = storage;
        this.name = name;
        this.isRunning = false;
        this.shutdownCallback = null;
        this.isLeader = false;
        this.loopTimeout = 3 * 1000; // 3 seconds for refresh
    }

    /** Runs main loop that handles leadership detection */
    run() {
        let self = this;
        self.isRunning = true;
        async.whilst(
            () => { return self.isRunning; },
            (xcallback) => {
                setTimeout(function () {
                    if (self.isLeader) {
                        self.performLeaderLoop(xcallback);
                    } else {
                        self.checkIfLeader(xcallback);
                    }
                }, self.loopTimeout);
            },
            (err) => {
                log.logger().important("[Leader] Leader shutdown finished.");
                if (self.shutdownCallback) {
                    self.shutdownCallback(err);
                }
            }
        );
    }

    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        self.shutdownCallback = callback;
        self.isRunning = false;
    }

    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    private checkIfLeader(callback: intf.SimpleCallback) {
        let self = this;
        self.storage.getLeadershipStatus((err, res) => {
            if (err) return callback(err);
            if (res.leadership == "ok") return callback();
            if (res.leadership == "pending") return callback();
            // status is vacant
            self.storage.announceLeaderCandidacy(self.name, (err) => {
                if (err) return callback(err);
                self.storage.checkLeaderCandidacy(self.name, (err, is_leader) => {
                    if (err) return callback(err);
                    self.isLeader = is_leader;
                    if (self.isLeader) {
                        log.logger().important("[Leader] This worker became a leader...");
                    }
                    callback();
                });
            });
        });
    }

    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    private performLeaderLoop(callback: intf.SimpleCallback) {
        let self = this;
        let alive_workers: intf.LeadershipResultWorkerStatus[] = null;
        let worker_weights: Map<string, number> = new Map<string, number>();
        async.series(
            [
                (xcallback) => {
                    self.storage.getWorkerStatus((err, workers) => {
                        if (err) return xcallback(err);
                        // each worker: name, status, topology_count
                        // possible statuses: alive, dead, unloaded
                        let dead_workers = workers
                            .filter(x => x.status === "dead")
                            .map(x => x.name);
                        alive_workers = workers
                            .filter(x => x.status === "alive");
                        if (alive_workers.length == 0) {
                            return xcallback();
                        }
                        async.each(
                            dead_workers,
                            (dead_worker, xxcallback) => {
                                self.handleDeadWorker(dead_worker, xxcallback);
                            },
                            xcallback
                        );
                    });
                },
                (xcallback) => {
                    if (alive_workers.length == 0) {
                        return xcallback();
                    }
                    self.storage.getTopologyStatus((err, topologies) => {
                        if (err) return xcallback(err);
                        // each topology: name, status, worker, weight, affinity, enabled
                        // possible statuses: unassigned, waiting, running, error, stopped
                        topologies.filter(x => x.enabled);
                        topologies.forEach(x => {
                            x.weight = x.weight || 1;
                            x.worker_affinity = x.worker_affinity || [];
                            if (x.status == "") {
                                for (let worker of alive_workers) {
                                    if (worker.name == x.worker) {
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
                            .filter(x => x.status === "unassigned" || x.status === "stopped");
                        if (unassigned_topologies.length > 0) {
                            log.logger().log("[Leader] Found unassigned topologies: " + unassigned_topologies)
                        }
                        let load_balancer = new lb.LoadBalancerEx(
                            alive_workers.map(x => {
                                return { name: x.name, weight: worker_weights.get(x.name) };
                            }),
                            5 // affinity means 5x stronger gravitational pull to that worker
                        );
                        async.each(
                            unassigned_topologies,
                            (unassigned_topology, xxcallback) => {
                                let ut = unassigned_topology as intf.LeadershipResultTopologyStatus;
                                let target = load_balancer.next(ut.worker_affinity, ut.weight);
                                log.logger().log(`[Leader] Assigning topology ${unassigned_topology} to worker ${target}`);
                                self.storage.assignTopology(unassigned_topology, target, xxcallback);
                            },
                            xcallback
                        );
                    });
                }
            ],
            callback
        );
    }

    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    private handleDeadWorker(dead_worker: string, callback: intf.SimpleCallback) {
        log.logger().important("[Leader] Handling dead worker " + dead_worker);
        let self = this;
        self.storage.getTopologiesForWorker(dead_worker, (err, topologies) => {
            async.each(
                topologies,
                (topology, xcallback) => {
                    log.logger().important("[Leader] Unassigning topology " + topology.uuid);
                    self.storage.setTopologyStatus(topology.uuid, "unassigned", null, xcallback);
                },
                (err) => {
                    if (err) {
                        log.logger().important("[Leader] Error while handling dead worker " + err);
                        return callback(err);
                    }
                    log.logger().important("[Leader] Setting dead worker as unloaded" + dead_worker);
                    self.storage.setWorkerStatus(dead_worker, "unloaded", callback);
                }
            );
        });
    }
}
