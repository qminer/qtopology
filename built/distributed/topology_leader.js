"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const lb = require("../util/load_balance");
const intf = require("../topology_interfaces");
const log = require("../util/logger");
const AFFINITY_FACTOR = 5;
const REBALANCE_INTERVAL = 60 * 60 * 1000;
const DEFAULT_LEADER_LOOP_INTERVAL = 5 * 1000;
const MESSAGE_INTERVAL = 120 * 1000;
const WORKER_IDLE_INTERVAL = 300 * 1000;
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
        this.loop_timeout = loop_timeout || DEFAULT_LEADER_LOOP_INTERVAL;
        this.next_rebalance = Date.now() + REBALANCE_INTERVAL;
        this.log_prefix = "[Leader] ";
    }
    /** Gets an indication if this instance is running. */
    isRunning() {
        return this.is_running;
    }
    /** Gets current value of indicator that this instance
     * has been elected a leader */
    isLeader() {
        return this.is_leader;
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
                self.singleLoopStep(xcallback);
            }, self.loop_timeout);
        }, (err) => {
            log.logger().important(self.log_prefix + "Leader shutdown finished.");
            self.is_shut_down = true;
            self.is_running = false;
            if (self.shutdown_callback) {
                self.shutdown_callback(err);
            }
            else {
                // if the parent didn't trigger the shutdown,
                // he will have to query isRunning() method and act appropriatelly.
                if (err) {
                    log.logger().error("Error in leadership");
                    log.logger().exception(err);
                }
            }
        });
    }
    /** Single step for loop - can be called form outside, for testing. */
    singleLoopStep(callback) {
        let self = this;
        if (self.is_leader) {
            self.performLeaderLoop(callback);
        }
        else {
            self.checkIfLeaderDetermined(callback);
        }
    }
    /** Shut down the loop */
    shutdown(callback) {
        let self = this;
        if (self.is_shut_down) {
            log.logger().important(self.log_prefix + `Already shut down.`);
            callback();
        }
        else {
            self.shutdown_callback = callback;
            log.logger().important(self.log_prefix + `Shutting down.`);
            self.is_running = false;
        }
    }
    /** Forces this leader to perform a rebalance the next time it runs its loop. */
    forceRebalance() {
        this.next_rebalance = 0;
    }
    /** Sometimes outside code gets instruction to assign topology to specific worker. */
    assignTopologyToWorker(target, uuid, callback) {
        let self = this;
        log.logger().important(self.log_prefix + `Assigning topology ${uuid} to worker ${target}`);
        self.storage.assignTopology(uuid, target, (err) => {
            if (err) {
                return callback(err);
            }
            self.storage.sendMessageToWorker(target, intf.Consts.LeaderMessages.start_topology, { uuid: uuid }, MESSAGE_INTERVAL, callback);
        });
    }
    /** Sometimes outside code gets instruction to assign topologies to specific worker. */
    assignTopologiesToWorker(target, uuids, callback) {
        let self = this;
        log.logger().important(self.log_prefix + `Assigning topologies ${uuids} to worker ${target}`);
        async.each(uuids, (uuid, xcallback) => {
            self.storage.assignTopology(uuid, target, xcallback);
        }, (err) => {
            if (err) {
                return callback(err);
            }
            self.storage.sendMessageToWorker(target, intf.Consts.LeaderMessages.start_topologies, { uuids: uuids }, MESSAGE_INTERVAL, callback);
        });
    }
    /** This method sets status of this object to normal */
    releaseLeadership(callback) {
        this.storage.setWorkerLStatus(this.name, intf.Consts.WorkerLStatus.normal, callback);
    }
    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    checkIfLeaderDetermined(callback) {
        let self = this;
        let should_announce = true;
        async.series([
            (xcallback) => {
                self.refreshStatuses((err, data) => {
                    if (err)
                        return xcallback(err); // TODO: err leads to candidacy!
                    should_announce = (data.leadership_status != intf.Consts.LeadershipStatus.ok && data.own_status == intf.Consts.WorkerStatus.alive);
                    xcallback();
                });
            },
            (xcallback) => {
                if (!should_announce)
                    return xcallback();
                log.logger().important(self.log_prefix + `Announcing leader candidacy.`);
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
                        log.logger().important(self.log_prefix + "This worker became a leader...");
                        self.performLeaderLoop(xcallback);
                    }
                    else {
                        log.logger().important(self.log_prefix + "This worker did not become a leader...");
                        xcallback();
                    }
                });
            }
        ], callback);
    }
    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    performLeaderLoop(callback) {
        let self = this;
        let perform_loop = true;
        let alive_workers = [];
        let worker_weights = new Map();
        let topologies_for_rebalance = [];
        let topologies_disabled = [];
        let topologies_enabled = [];
        async.series([
            (xcallback) => {
                self.refreshStatuses((err, data) => {
                    xcallback(err);
                });
            },
            (xcallback) => {
                self.storage.getWorkerStatus((err, workers) => {
                    if (err)
                        return xcallback(err);
                    let this_worker_lstatus = workers
                        .filter(x => x.name === self.name)
                        .map(x => x.lstatus)[0];
                    if (this_worker_lstatus != intf.Consts.WorkerLStatus.leader) {
                        // this worker is not marked as leader, abort leadership
                        perform_loop = false;
                        self.is_leader = false;
                        return xcallback();
                    }
                    let this_worker_status = workers
                        .filter(x => x.name === self.name)
                        .map(x => x.status)[0];
                    if (this_worker_status != intf.Consts.WorkerStatus.alive) {
                        // this worker is not marked as alive, abort leadership
                        perform_loop = false;
                        self.is_leader = false;
                        return self.storage.setWorkerLStatus(self.name, intf.Consts.WorkerLStatus.normal, xcallback);
                    }
                    alive_workers = workers
                        .filter(x => x.status === intf.Consts.WorkerStatus.alive);
                    let dead_workers = workers
                        .filter(x => x.status === intf.Consts.WorkerStatus.dead)
                        .map(x => x.name);
                    async.each(dead_workers, (dead_worker, ycallback) => {
                        self.handleDeadWorker(dead_worker, ycallback);
                    }, xcallback);
                });
            },
            (xcallback) => {
                if (!perform_loop) {
                    return xcallback();
                }
                // retrieve list of topologies and their statuses
                self.storage.getTopologyStatus((err, topologies_all) => {
                    if (err)
                        return xcallback(err);
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
                }
                else {
                    xcallback();
                }
            }
        ], callback);
    }
    /** Check enabled topologies - if they are marked as running, they must be assigned to worker */
    handleSuspiciousTopologies(topologies_enabled, topologies_disabled, callback) {
        let self = this;
        let targets = topologies_enabled
            .filter(x => x.status == intf.Consts.TopologyStatus.running && x.worker == null);
        async.each(targets, (item, xcallback) => {
            // strange, topology marked as enabled and running, but no worker specified
            // mark it as unassinged.
            log.logger().important(this.log_prefix + "Topology marked as running and enabled, but no worker specified: " + item.uuid);
            self.storage.setTopologyStatus(item.uuid, null, intf.Consts.TopologyStatus.unassigned, null, (err) => {
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
    assignUnassignedTopologies(topologies_enabled, topologies_for_rebalance, alive_workers, worker_weights, callback) {
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
                affinity: x.worker_affinity,
                forced_affinity: []
            });
        });
        let unassigned_topologies = topologies_enabled
            .filter(x => x.status === intf.Consts.TopologyStatus.unassigned);
        if (unassigned_topologies.length > 0) {
            log.logger().important(self.log_prefix + "Found unassigned topologies: " + JSON.stringify(unassigned_topologies));
        }
        // assign unassigned topologies
        let load_balancer = new lb.LoadBalancerEx(alive_workers.map(x => {
            return { name: x.name, weight: worker_weights.get(x.name) || 0 };
        }), AFFINITY_FACTOR // affinity means N-times stronger gravitational pull towards that worker
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
        async.each(tasks, (task, xcallback) => {
            self.assignTopologiesToWorker(task.worker, task.uuids, xcallback);
        }, callback);
    }
    /** This method will perform rebalance of topologies on workers if needed.
     */
    performRebalanceIfNeeded(workers, topologies, callback) {
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
        let load_balancer = new lb.LoadBalancerEx(workers.map(x => {
            return {
                name: x.name,
                weight: topologies
                    .filter(y => y.worker == x.name) // running on this worker
                    .map(y => y.weight) // get their weights
                    .reduce((prev, curr) => prev + curr, 0) // sum the weights
            };
        }), AFFINITY_FACTOR);
        let steps = load_balancer.rebalance(topologies);
        // group rebalancing by old worker
        let rebalance_tasks = [];
        let workers_old = Array.from(new Set(steps.changes.map(change => change.worker_old)));
        for (let worker_old of workers_old) {
            let worker_changes = steps.changes.filter(change => change.worker_old == worker_old);
            let stop_topologies = worker_changes.map(change => { return { uuid: change.uuid, worker_new: change.worker_new }; });
            rebalance_tasks.push({ worker_old: worker_old, stop_topologies: stop_topologies });
        }
        async.each(rebalance_tasks, (rebalance_task, xcallback) => {
            log.logger().important(self.log_prefix + `Rebalancing - moving topologies from worker ${rebalance_task.worker_old}` +
                `: ${rebalance_task.stop_topologies.map(x => x.uuid + ' -> ' + x.worker_new).join(', ')}`);
            self.storage.sendMessageToWorker(rebalance_task.worker_old, intf.Consts.LeaderMessages.stop_topologies, { stop_topologies: rebalance_task.stop_topologies }, MESSAGE_INTERVAL, xcallback);
        }, callback);
    }
    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    handleDeadWorker(dead_worker, callback) {
        let self = this;
        log.logger().important(self.log_prefix + "Handling dead worker " + dead_worker);
        self.storage.getTopologiesForWorker(dead_worker, (err, topologies) => {
            async.each(topologies, (topology, xcallback) => {
                log.logger().important(self.log_prefix + "Unassigning topology " + topology.uuid);
                if (topology.status == intf.Consts.TopologyStatus.error) {
                    // this status must stay as it is
                    xcallback();
                }
                else {
                    self.storage.setTopologyStatus(topology.uuid, null, intf.Consts.TopologyStatus.unassigned, null, xcallback);
                }
            }, (err) => {
                if (err) {
                    log.logger().important(self.log_prefix + "Error while handling dead worker " + err);
                    return callback(err);
                }
                log.logger().important(self.log_prefix + "Setting dead worker as unloaded: " + dead_worker);
                self.storage.setWorkerStatus(dead_worker, intf.Consts.WorkerStatus.unloaded, callback);
            });
        });
    }
    /** Checks single worker record and de-activates it if needed. */
    disableDefunctWorkerSingle(worker, callback) {
        let self = this;
        let limit = Date.now() - WORKER_IDLE_INTERVAL;
        async.series([
            (xcallback) => {
                // nothing to do for dead and unloaded workers
                if (worker.status == intf.Consts.WorkerStatus.dead ||
                    worker.status == intf.Consts.WorkerStatus.unloaded) {
                    return xcallback();
                }
                // nothing to do for workers that pinged recently
                if (worker.last_ping >= limit) {
                    return xcallback();
                }
                // unresponsive worker found
                log.logger().important(self.log_prefix + `Reporting live worker ${worker.name} as dead (sec since ping: ${(Date.now() - worker.last_ping) / 1000})`);
                worker.status = intf.Consts.WorkerStatus.dead;
                // TODO what if worker just had an old PING when starting two servers simultaneously?
                // TODO what if worker timed out, but comes back? Should we change it's status to live?
                // TODO how can leadership loop run when worker is dead?
                self.storage.setWorkerStatus(worker.name, worker.status, xcallback);
            },
            (xcallback) => {
                // only alive workers can be leaders
                if (worker.lstatus != intf.Consts.WorkerLStatus.normal && worker.status != intf.Consts.WorkerStatus.alive) {
                    log.logger().important(self.log_prefix + `Reporting worker ${worker.name} leadership as normal (before leadership was ${intf.Consts.WorkerLStatus[worker.lstatus]}, worker was ${intf.Consts.WorkerStatus[worker.status]})`);
                    worker.lstatus = intf.Consts.WorkerLStatus.normal;
                    self.storage.setWorkerLStatus(worker.name, worker.lstatus, xcallback);
                }
                else {
                    xcallback();
                }
            }
        ], callback);
    }
    /** checks all worker records if any of them is not active anymore. */
    disableDefunctWorkers(data_workers, callback) {
        let self = this;
        async.each(data_workers, (worker, xcallback) => {
            self.disableDefunctWorkerSingle(worker, xcallback);
        }, callback);
    }
    /** Detaches toplogies from inactive workers */
    unassignWaitingTopologies(data_workers, callback) {
        let self = this;
        let dead_workers = data_workers
            .filter(x => x.status == intf.Consts.WorkerStatus.dead || x.status == intf.Consts.WorkerStatus.unloaded)
            .map(x => x.name);
        self.storage.getTopologyStatus((err, data) => {
            if (err)
                return callback(err);
            let limit = Date.now() - WORKER_IDLE_INTERVAL;
            async.each(data, (topology, xcallback) => {
                if (topology.status == intf.Consts.TopologyStatus.waiting && topology.last_ping < limit) {
                    log.logger().important(self.log_prefix + `Unassigning waiting topology ${topology.uuid} (sec since ping: ${(Date.now() - topology.last_ping) / 1000})`);
                    self.storage.setTopologyStatus(topology.uuid, null, intf.Consts.TopologyStatus.unassigned, null, xcallback);
                }
                else if (topology.status == intf.Consts.TopologyStatus.running && dead_workers.indexOf(topology.worker) >= 0) {
                    log.logger().important(self.log_prefix + `Unassigning running topology ${topology.uuid} on a dead worker ${topology.worker}`);
                    self.storage.setTopologyStatus(topology.uuid, null, intf.Consts.TopologyStatus.unassigned, null, xcallback);
                }
                else {
                    xcallback();
                }
            }, callback);
        });
    }
    /** Gets and refreshes worker statuses */
    refreshStatuses(callback) {
        let self = this;
        let workers = null;
        let res = {
            leadership_status: intf.Consts.LeadershipStatus.vacant,
            own_status: null,
            own_lstatus: null
        };
        async.series([
            (xcallback) => {
                self.storage.getWorkerStatus((err, data) => {
                    if (err)
                        return xcallback(err);
                    workers = data;
                    let own_data = workers
                        .filter(x => x.name == self.name);
                    if (own_data.length > 0) {
                        res.own_status = own_data[0].status;
                        res.own_lstatus = own_data[0].lstatus;
                    }
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
        ], (err) => {
            if (err) {
                return callback(err);
            }
            else {
                return callback(null, res);
            }
        });
    }
    /** Utility function that resembles leadership - removes error flag for topology.
     * But it is not called within leader object.
     */
    static clearTopologyError(uuid, storage, callback) {
        let topology_data = null;
        let do_assign = false;
        async.series([
            (xcallback) => {
                storage.getTopologyInfo(uuid, (err, data) => {
                    if (err)
                        return callback(err);
                    topology_data = data;
                    if (topology_data.status != intf.Consts.TopologyStatus.error) {
                        return xcallback(new Error("Specified topology is not marked as error: " + uuid));
                    }
                    xcallback();
                });
            },
            (xcallback) => {
                storage.getWorkerStatus((err, data) => {
                    if (err)
                        return xcallback(err);
                    let worker = data
                        .filter(x => x.name == topology_data.worker)
                        .map(x => x.status);
                    // automatically assign to the same server - this will make sure that
                    // any local data is processed again.
                    do_assign = (worker.length > 0 && worker[0] == intf.Consts.WorkerStatus.alive);
                    xcallback();
                });
            },
            (xcallback) => {
                if (do_assign) {
                    storage.assignTopology(uuid, topology_data.worker, xcallback);
                }
                else {
                    storage.setTopologyStatus(uuid, null, intf.Consts.TopologyStatus.unassigned, null, xcallback);
                }
            },
            (xcallback) => {
                if (do_assign) {
                    storage.sendMessageToWorker(topology_data.worker, intf.Consts.LeaderMessages.start_topology, { uuid: uuid }, MESSAGE_INTERVAL, xcallback);
                }
                else {
                    xcallback();
                }
            }
        ], callback);
    }
}
exports.TopologyLeader = TopologyLeader;
//# sourceMappingURL=topology_leader.js.map