
import * as async from "async";
import * as lb from "../util/load_balance";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger"

const AFFINITY_FACTOR: number = 5;
const REBALANCE_INTERVAL: number = 60 * 60 * 1000;
const DEFAULT_LEADER_LOOP_INTERVAL: number = 5 * 1000;
const MESSAGE_INTERVAL: number = 20 * 1000;
const WORKER_IDLE_INTERVAL: number = 30 * 1000;
const LEADER_IDLE_INTERVAL: number = 3 * DEFAULT_LEADER_LOOP_INTERVAL;

interface RefreshStatusesResult {
    leadership_status: string;
}

/** This class handles leader-status determination and
 * performs leadership tasks if marked as leader.
 */
export class TopologyLeader {

    private storage: intf.CoordinationStorage;
    private name: string;
    private is_running: boolean;
    private is_shut_down: boolean;
    private is_leader: boolean;
    private shutdown_callback: intf.SimpleCallback;
    private loop_timeout: number;
    private next_rebalance: number;
    private log_prefix: string;

    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage, loop_timeout: number) {
        this.storage = storage;
        this.name = name;
        this.is_running = false;
        this.shutdown_callback = null;
        this.is_leader = false;
        this.is_shut_down = false;
        this.loop_timeout = loop_timeout || DEFAULT_LEADER_LOOP_INTERVAL;
        this.next_rebalance = Date.now() + REBALANCE_INTERVAL;
        this.log_prefix = "[Leader] ";
    }

    /** Gets an indication if this instance is running. */
    isRunning(): boolean {
        return this.is_running;
    }

    /** Gets current value of indicator that this instance
     * has been elected a leader */
    isLeader(): boolean {
        return this.is_leader;
    }

    /** Runs main loop that handles leadership detection */
    run() {
        let self = this;
        self.is_shut_down = false;
        self.is_running = true;
        async.whilst(
            () => {
                return self.is_running;
            },
            (xcallback) => {
                setTimeout(() => {
                    self.singleLoopStep(xcallback);
                }, self.loop_timeout);
            },
            (err: Error) => {
                log.logger().important(self.log_prefix + "Leader shutdown finished.");
                self.is_shut_down = true;
                self.is_running = false;
                if (self.shutdown_callback) {
                    self.shutdown_callback(err);
                } else {
                    // if the parent didn't trigger the shutdown,
                    // he will have to query isRunning() method and act appropriatelly.
                    if (err) {
                        log.logger().error("Error in leadership");
                        log.logger().exception(err);
                    }
                }
            }
        );
    }

    /** Single step for loop - can be called form outside, for testing. */
    singleLoopStep(callback: intf.SimpleCallback) {
        let self = this;
        if (self.is_leader) {
            self.performLeaderLoop(callback);
        } else {
            self.checkIfLeaderDetermined(callback);
        }
    }

    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        if (self.is_shut_down) {
            callback();
        } else {
            self.shutdown_callback = callback;
            self.is_running = false;
        }
    }

    /** Forces this leader to perform a rebalance the next time it runs its loop. */
    forceRebalance() {
        this.next_rebalance = 0;
    }

    /** Sometimes outside code gets instruction to assign topology to specific worker. */
    assignTopologyToWorker(target: string, uuid: string, callback: intf.SimpleCallback) {
        let self = this;
        log.logger().log(self.log_prefix + `Assigning topology ${uuid} to worker ${target}`);
        self.storage.assignTopology(uuid, target, (err: Error) => {
            if (err) { return callback(err); }
            self.storage.sendMessageToWorker(target, intf.Consts.LeaderMessages.start_topology, { uuid: uuid }, MESSAGE_INTERVAL, callback);
        });
    }

    /** Sometimes outside code gets instruction to assign topologies to specific worker. */
    assignTopologiesToWorker(target: string, uuids: string[], callback: intf.SimpleCallback) {
        let self = this;
        log.logger().log(self.log_prefix + `Assigning topologies ${uuids} to worker ${target}`);
        async.each(uuids, (uuid, xcallback) => {
            self.storage.assignTopology(uuid, target, xcallback);
        }, (err: Error) => {
            if (err) { return callback(err); }
            self.storage.sendMessageToWorker(target, intf.Consts.LeaderMessages.start_topologies,
                { uuids: uuids }, MESSAGE_INTERVAL, callback);
        });
    }

    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    private checkIfLeaderDetermined(callback: intf.SimpleCallback) {
        let self = this;
        let should_announce = true;
        async.series(
            [
                (xcallback) => {
                    self.refreshStatuses((err, data) => {
                        if (err) return xcallback(err);
                        should_announce = (data.leadership_status != intf.Consts.LeadershipStatus.ok);
                        xcallback();
                    });
                },
                (xcallback) => {
                    if (!should_announce) return xcallback();
                    self.storage.announceLeaderCandidacy(self.name, xcallback);
                },
                (xcallback) => {
                    if (!should_announce) return xcallback();
                    self.storage.checkLeaderCandidacy(self.name, (err, is_leader) => {
                        if (err) return xcallback(err);
                        self.is_leader = is_leader;
                        if (self.is_leader) {
                            log.logger().important(self.log_prefix + "This worker became a leader...");
                            self.performLeaderLoop(xcallback);
                        } else {
                            xcallback();
                        }
                    });
                }
            ],
            callback
        );
    }

    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    private performLeaderLoop(callback: intf.SimpleCallback) {
        let self = this;
        let perform_loop = true;
        let alive_workers: intf.WorkerStatus[] = [];
        let worker_weights: Map<string, number> = new Map<string, number>();

        let topologies_for_rebalance: lb.Topology[] = [];
        let topologies_disabled: intf.TopologyStatus[] = [];
        let topologies_enabled: intf.TopologyStatus[] = [];

        async.series(
            [
                (xcallback) => {
                    self.storage.getWorkerStatus((err, workers) => {
                        if (err) return xcallback(err);
                        let this_worker_lstatus = workers
                            .filter(x => x.name === self.name)
                            .map(x => x.lstatus)[0];
                        if (this_worker_lstatus != intf.Consts.WorkerLStatus.leader) {
                            // this worker is not marked as leader, abort leadership
                            perform_loop = false;
                            self.is_leader = false;
                            return xcallback();
                        }
                        alive_workers = workers
                            .filter(x => x.status === intf.Consts.WorkerStatus.alive);
                        let dead_workers = workers
                            .filter(x => x.status === intf.Consts.WorkerStatus.dead)
                            .map(x => x.name);
                        async.each(
                            dead_workers,
                            (dead_worker: string, ycallback) => {
                                self.handleDeadWorker(dead_worker, ycallback);
                            },
                            xcallback
                        );
                    });
                },
                (xcallback) => {
                    if (!perform_loop) {
                        return xcallback();
                    }
                    // retrieve list of topologies and their statuses
                    self.storage.getTopologyStatus((err, topologies_all) => {
                        if (err) return xcallback(err);
                        topologies_disabled = topologies_all.filter(x => !x.enabled);
                        topologies_enabled = topologies_all.filter(x => x.enabled);
                        xcallback();
                    });
                },
                (xcallback) => {
                    if (!perform_loop) {
                        return xcallback();
                    }
                    // Check enabled topologies - if they are marked as running, they must be assigned to worker
                    self.handleSuspiciousTopologies(topologies_enabled, topologies_disabled, xcallback);
                },
                (xcallback) => {
                    if (!perform_loop || alive_workers.length == 0) {
                        return xcallback();
                    }
                    // go through all enabled topologies and calculate current loads for workers
                    self.assignUnassignedTopologies(topologies_enabled, topologies_for_rebalance, alive_workers, worker_weights, xcallback);
                },
                (xcallback) => {
                    if (!perform_loop || alive_workers.length == 0) {
                        return xcallback();
                    }
                    // check if occasional rebalancing needs to be performed
                    if (self.is_leader) {
                        self.performRebalanceIfNeeded(alive_workers, topologies_for_rebalance, xcallback);
                    } else {
                        xcallback();
                    }
                }
            ],
            callback
        );
    }

    /** Check enabled topologies - if they are marked as running, they must be assigned to worker */
    private handleSuspiciousTopologies(
        topologies_enabled: intf.TopologyStatus[],
        topologies_disabled: intf.TopologyStatus[],
        callback: intf.SimpleCallback) {

        let self = this;
        let targets = topologies_enabled
            .filter(x => x.status == intf.Consts.TopologyStatus.running && x.worker == null);
        async.each(targets, (item: intf.TopologyStatus, xcallback) => {
            // strange, topology marked as enabled and running, but no worker specified
            // mark it as unassinged.
            log.logger().important(this.log_prefix + "Topology marked as running and enabled, but no worker specified: " + item.uuid);
            self.storage.setTopologyStatus(item.uuid, intf.Consts.TopologyStatus.unassigned, null, (err) => {
                if (err)
                    return xcallback(err);
                // move the topology in internal arrays
                topologies_enabled.splice(topologies_enabled.indexOf(item), 1);
                topologies_disabled.push(item);
                xcallback();
            });
        }, callback);
    }

    /** go through all enabled topologies and calculate current loads for workers.
     * Then assign unassigned topologies to appropiate workers.
     */
    private assignUnassignedTopologies(
        topologies_enabled: intf.TopologyStatus[],
        topologies_for_rebalance: lb.Topology[],
        alive_workers: intf.WorkerStatus[],
        worker_weights: Map<string, number>,
        callback: intf.SimpleCallback) {

        let self = this;
        topologies_enabled.forEach(x => {
            x.weight = x.weight || 1;
            x.worker_affinity = x.worker_affinity || [];
            if (x.status == intf.Consts.TopologyStatus.running) {
                for (let worker of alive_workers) {
                    let name = worker.name;
                    if (name == x.worker) {
                        let old_weight = (worker_weights.has(name) ? worker_weights.get(name) : 0);
                        worker_weights.set(name, old_weight + x.weight);
                        break;
                    }
                }
            }
            topologies_for_rebalance.push({
                uuid: x.uuid,
                weight: x.weight,
                worker: x.worker,
                affinity: x.worker_affinity
            });
        });

        let unassigned_topologies = topologies_enabled
            .filter(x => x.status === intf.Consts.TopologyStatus.unassigned);
        if (unassigned_topologies.length > 0) {
            log.logger().log(self.log_prefix + "Found unassigned topologies: " + JSON.stringify(unassigned_topologies));
        }
        // assign unassigned topologies
        let load_balancer = new lb.LoadBalancerEx(
            alive_workers.map(x => {
                return { name: x.name, weight: worker_weights.get(x.name) || 0 };
            }),
            AFFINITY_FACTOR // affinity means N-times stronger gravitational pull towards that worker
        );
        let assignments = unassigned_topologies
            .map(x => {
                let worker = load_balancer.next(x.worker_affinity, x.weight);
                topologies_for_rebalance
                    .filter(y => y.uuid == x.uuid)
                    .forEach(y => { y.worker = worker; });
                return { uuid: x.uuid, worker: worker };
            });

        // group assignments by worker
        let tasks = [];
        let workers = Array.from(new Set(assignments.map(a => a.worker)));
        for (let worker of workers) {
            let worker_assignments = assignments.filter(a => a.worker == worker);
            let uuids = worker_assignments.map(a => a.uuid);
            tasks.push({ worker: worker, uuids: uuids });
        }
        async.each(
            tasks,
            (task, xcallback) => {
                self.assignTopologiesToWorker(task.worker, task.uuids, xcallback);
            },
            callback);
    }

    /** This method will perform rebalance of topologies on workers if needed.
     */
    private performRebalanceIfNeeded(workers: intf.WorkerStatus[], topologies: lb.Topology[], callback) {
        let self = this;
        if (self.next_rebalance > Date.now()) {
            return callback();
        }
        self.next_rebalance = Date.now() + REBALANCE_INTERVAL;
        if (!workers || workers.length == 0) {
            return callback();
        }
        if (!topologies || topologies.length == 0) {
            return callback();
        }
        let load_balancer = new lb.LoadBalancerEx(
            workers.map(x => {
                return { name: x.name, weight: 0 };
            }),
            AFFINITY_FACTOR
        );
        let steps = load_balancer.rebalance(topologies);
        // group rebalancing by old worker
        let rebalance_tasks = [];
        let workers_old = Array.from(new Set(steps.changes.map(change => change.worker_old)));
        for (let worker_old of workers_old) {
            let worker_changes = steps.changes.filter(change => change.worker_old == worker_old);
            let stop_topologies = worker_changes.map(change => { return { uuid: change.uuid, worker_new: change.worker_new }; });
            rebalance_tasks.push({ worker_old: worker_old, stop_topologies: stop_topologies });
        }
        async.each(
            rebalance_tasks,
            (rebalance_task, xcallback) => {
                log.logger().log(self.log_prefix + `Rebalancing - moving topologies from worker ${rebalance_task.worker_old}` + 
                 `: ${rebalance_task.stop_topologies.map(x => x.uuid + ' -> ' + x.worker_new).join(', ')}`);
                self.storage.sendMessageToWorker(
                    rebalance_task.worker_old,
                    intf.Consts.LeaderMessages.stop_topologies,
                    { stop_topologies: rebalance_task.stop_topologies },
                    MESSAGE_INTERVAL,
                    xcallback);
            },
            callback
        );
    }

    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    private handleDeadWorker(dead_worker: string, callback: intf.SimpleCallback) {
        let self = this;
        log.logger().important(self.log_prefix + "Handling dead worker " + dead_worker);
        self.storage.getTopologiesForWorker(dead_worker, (err, topologies) => {
            async.each(
                topologies,
                (topology, xcallback) => {
                    log.logger().important(self.log_prefix + "Unassigning topology " + topology.uuid);
                    if (topology.status == intf.Consts.TopologyStatus.error) {
                        // this status must stay as it is
                        xcallback();
                    } else {
                        self.storage.setTopologyStatus(topology.uuid, intf.Consts.TopologyStatus.unassigned, null, xcallback);
                    }
                },
                (err: Error) => {
                    if (err) {
                        log.logger().important(self.log_prefix + "Error while handling dead worker " + err);
                        return callback(err);
                    }
                    log.logger().important(self.log_prefix + "Setting dead worker as unloaded: " + dead_worker);
                    self.storage.setWorkerStatus(dead_worker, intf.Consts.WorkerStatus.unloaded, callback);
                }
            );
        });
    }

    /** Checks single worker record and de-activates it if needed. */
    private disableDefunctWorkerSingle(worker: intf.WorkerStatus, callback: intf.SimpleCallback) {
        let self = this;
        let limit1 = Date.now() - WORKER_IDLE_INTERVAL;
        let limit2 = Date.now() - LEADER_IDLE_INTERVAL;

        async.series(
            [
                (xcallback) => {
                    // handle status
                    if (worker.status != intf.Consts.WorkerStatus.alive) return xcallback();
                    if (worker.last_ping >= limit1) return xcallback();
                    worker.status = intf.Consts.WorkerStatus.dead;
                    self.storage.setWorkerStatus(worker.name, worker.status, xcallback);
                },
                (xcallback) => {
                    // handle lstatus
                    if (worker.lstatus != intf.Consts.WorkerLStatus.normal && worker.status != intf.Consts.WorkerStatus.alive) {
                        worker.lstatus = intf.Consts.WorkerLStatus.normal;
                        self.storage.setWorkerLStatus(worker.name, worker.lstatus, xcallback);
                    } else if (worker.lstatus != intf.Consts.WorkerLStatus.normal && worker.last_ping < limit2) {
                        worker.lstatus = intf.Consts.WorkerLStatus.normal;
                        self.storage.setWorkerLStatus(worker.name, worker.lstatus, xcallback);
                    } else {
                        xcallback();
                    }
                }
            ],
            callback
        );
    }

    /** checks all worker records if any of them is not active anymore. */
    private disableDefunctWorkers(data_workers: intf.WorkerStatus[], callback: intf.SimpleCallback) {
        let self = this;
        async.each(
            data_workers,
            (worker: intf.WorkerStatus, xcallback) => {
                self.disableDefunctWorkerSingle(worker, xcallback);
            },
            callback
        );
    }

    /** Detaches toplogies from inactive workers */
    private unassignWaitingTopologies(data_workers: intf.WorkerStatus[], callback: intf.SimpleCallback) {
        let self = this;
        let dead_workers = data_workers
            .filter(x => x.status == intf.Consts.WorkerStatus.dead || x.status == intf.Consts.WorkerStatus.unloaded)
            .map(x => x.name);
        self.storage.getTopologyStatus((err, data) => {
            if (err) return callback(err);
            let limit = Date.now() - WORKER_IDLE_INTERVAL;
            async.each(
                data,
                (topology: intf.TopologyStatus, xcallback) => {
                    if (topology.status == intf.Consts.TopologyStatus.waiting && topology.last_ping < limit) {
                        self.storage.setTopologyStatus(topology.uuid, intf.Consts.TopologyStatus.unassigned, null, xcallback);
                    } else if (topology.status == intf.Consts.TopologyStatus.running && dead_workers.indexOf(topology.worker) >= 0) {
                        self.storage.setTopologyStatus(topology.uuid, intf.Consts.TopologyStatus.unassigned, null, xcallback);
                    } else {
                        xcallback();
                    }
                },
                callback
            );
        });
    }

    /** Gets and refreshes worker statuses */
    private refreshStatuses(callback: intf.SimpleResultCallback<RefreshStatusesResult>) {
        let self = this;
        let workers: intf.WorkerStatus[] = null;
        let res: RefreshStatusesResult = {
            leadership_status: intf.Consts.LeadershipStatus.vacant
        };
        async.series(
            [
                (xcallback) => {
                    self.storage.getWorkerStatus((err, data) => {
                        if (err) return xcallback(err);
                        workers = data;
                        xcallback();
                    });
                },
                (xcallback) => {
                    self.disableDefunctWorkers(workers, xcallback);
                },
                (xcallback) => {
                    self.unassignWaitingTopologies(workers, xcallback);
                },
                (xcallback) => {
                    var leader_cnt = workers
                        .filter(x => x.lstatus == intf.Consts.WorkerLStatus.leader)
                        .length;
                    if (leader_cnt > 0) {
                        res.leadership_status = intf.Consts.LeadershipStatus.ok;
                    }
                    xcallback();
                }
            ],
            (err: Error) => {
                if (err) {
                    return callback(err);
                } else {
                    return callback(null, res);
                }
            }
        );
    }
}
