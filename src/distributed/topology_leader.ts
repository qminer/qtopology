
import * as async from "async";
import * as lb from "../util/load_balance";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

const AFFINITY_FACTOR: number = 5;
const REBALANCE_INTERVAL: number = 60 * 60 * 1000;
const DEFAULT_LEADER_LOOP_INTERVAL: number = 5 * 1000;
const MESSAGE_INTERVAL: number = 120 * 1000;
const WORKER_IDLE_INTERVAL: number = 300 * 1000;

interface IRefreshStatusesResult {
    leadership_status: string;
    own_status: string;
    own_lstatus: string;
}

/** This class handles leader-status determination and
 * performs leadership tasks if marked as leader.
 */
export class TopologyLeader {

    /** Utility function that resembles leadership - removes error flag for topology.
     * But it is not called within leader object.
     */
    public static clearTopologyError(
        uuid: string, storage: intf.ICoordinationStorage,
        callback: intf.SimpleCallback
    ): void {
        let topology_data: intf.ITopologyInfoResponse = null;
        let do_assign = false;
        async.series(
            [
                xcallback => {
                    storage.getTopologyInfo(uuid, (err, data) => {
                        if (err) {
                            return callback(err);
                        }
                        topology_data = data;
                        if (topology_data.status != intf.CONSTS.TopologyStatus.error) {
                            return xcallback(new Error("Specified topology is not marked as error: " + uuid));
                        }
                        xcallback();
                    });
                },
                xcallback => {
                    storage.getWorkerStatus((err, data) => {
                        if (err) {
                            return xcallback(err);
                        }
                        const worker = data
                            .filter(x => x.name == topology_data.worker)
                            .map(x => x.status);
                        // automatically assign to the same server - this will make sure that
                        // any local data is processed again.
                        do_assign = (worker.length > 0 && worker[0] == intf.CONSTS.WorkerStatus.alive);
                        xcallback();
                    });
                },
                xcallback => {
                    if (do_assign) {
                        storage.assignTopology(uuid, topology_data.worker, xcallback);
                    } else {
                        storage.setTopologyStatus(
                            uuid,
                            null,
                            intf.CONSTS.TopologyStatus.unassigned,
                            null,
                            xcallback);
                    }
                },
                xcallback => {
                    if (do_assign) {
                        storage.sendMessageToWorker(
                            topology_data.worker,
                            intf.CONSTS.LeaderMessages.start_topology,
                            { uuid },
                            MESSAGE_INTERVAL,
                            xcallback);
                    } else {
                        xcallback();
                    }
                }
            ],
            callback
        );
    }

    private storage: intf.ICoordinationStorage;
    private name: string;
    private is_running: boolean;
    private is_shut_down: boolean;
    private is_leader: boolean;
    private shutdown_callback: intf.SimpleCallback;
    private loop_timeout: number;
    private next_rebalance: number;
    private log_prefix: string;

    /** Simple constructor */
    constructor(name: string, storage: intf.ICoordinationStorage, loop_timeout: number) {
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
    public isRunning(): boolean {
        return this.is_running;
    }

    /** Gets current value of indicator that this instance
     * has been elected a leader
     */
    public isLeader(): boolean {
        return this.is_leader;
    }

    /** Runs main loop that handles leadership detection */
    public run() {
        this.is_shut_down = false;
        this.is_running = true;
        async.whilst(
            () => {
                return this.is_running;
            },
            xcallback => {
                setTimeout(() => {
                    this.singleLoopStep(xcallback);
                }, this.loop_timeout);
            },
            (err: Error) => {
                log.logger().important(this.log_prefix + "Leader shutdown finished.");
                this.is_shut_down = true;
                this.is_running = false;
                if (this.shutdown_callback) {
                    this.shutdown_callback(err);
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
    public singleLoopStep(callback: intf.SimpleCallback) {
        if (this.is_leader) {
            this.performLeaderLoop(callback);
        } else {
            this.checkIfLeaderDetermined(callback);
        }
    }

    /** Shut down the loop */
    public shutdown(callback: intf.SimpleCallback) {
        if (this.is_shut_down) {
            log.logger().important(this.log_prefix + `Already shut down.`);
            callback();
        } else {
            this.shutdown_callback = callback;
            log.logger().important(this.log_prefix + `Shutting down.`);
            this.is_running = false;
        }
    }

    /** Forces this leader to perform a rebalance the next time it runs its loop. */
    public forceRebalance() {
        this.next_rebalance = 0;
    }

    /** Sometimes outside code gets instruction to assign topology to specific worker. */
    public assignTopologyToWorker(target: string, uuid: string, callback: intf.SimpleCallback) {
        log.logger().important(this.log_prefix + `Assigning topology ${uuid} to worker ${target}`);
        this.storage.assignTopology(uuid, target, (err: Error) => {
            if (err) { return callback(err); }
            this.storage.sendMessageToWorker(
                target, intf.CONSTS.LeaderMessages.start_topology,
                { uuid }, MESSAGE_INTERVAL, callback);
        });
    }

    /** Sometimes outside code gets instruction to assign topologies to specific worker. */
    public assignTopologiesToWorker(target: string, uuids: string[], callback: intf.SimpleCallback) {
        log.logger().important(this.log_prefix + `Assigning topologies ${uuids} to worker ${target}`);
        async.each(uuids, (uuid, xcallback) => {
            this.storage.assignTopology(uuid, target, xcallback);
        }, (err: Error) => {
            if (err) { return callback(err); }
            this.storage.sendMessageToWorker(target, intf.CONSTS.LeaderMessages.start_topologies,
                { uuids }, MESSAGE_INTERVAL, callback);
        });
    }

    /** This method sets status of this object to normal */
    public releaseLeadership(callback: intf.SimpleCallback) {
        this.storage.setWorkerLStatus(this.name, intf.CONSTS.WorkerLStatus.normal, callback);
    }

    /** Single step in checking if current node should be
     * promoted into leadership role.
     */
    private checkIfLeaderDetermined(callback: intf.SimpleCallback) {
        let should_announce = true;
        async.series(
            [
                xcallback => {
                    this.refreshStatuses((err, data) => {
                        if (err) {
                            return xcallback(err); // TODO: err leads to candidacy!
                        }
                        should_announce = (
                            data.leadership_status != intf.CONSTS.LeadershipStatus.ok &&
                            data.own_status == intf.CONSTS.WorkerStatus.alive);
                        xcallback();
                    });
                },
                xcallback => {
                    if (!should_announce) {
                        return xcallback();
                    }
                    log.logger().important(this.log_prefix + `Announcing leader candidacy.`);
                    this.storage.announceLeaderCandidacy(this.name, xcallback);
                },
                xcallback => {
                    if (!should_announce) {
                        return xcallback();
                    }
                    this.storage.checkLeaderCandidacy(this.name, (err, is_leader) => {
                        if (err) {
                            return xcallback(err);
                        }
                        this.is_leader = is_leader;
                        if (this.is_leader) {
                            log.logger().important(this.log_prefix + "This worker became a leader...");
                            this.performLeaderLoop(xcallback);
                        } else {
                            log.logger().important(this.log_prefix + "This worker did not become a leader...");
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
        let perform_loop = true;
        let alive_workers: intf.IWorkerStatus[] = [];
        const worker_weights: Map<string, number> = new Map<string, number>();

        const topologies_for_rebalance: lb.ITopology[] = [];
        let topologies_disabled: intf.ITopologyStatus[] = [];
        let topologies_enabled: intf.ITopologyStatus[] = [];

        async.series(
            [
                xcallback => {
                    this.refreshStatuses((err, data) => {
                        xcallback(err);
                    });
                },
                xcallback => {
                    this.storage.getWorkerStatus((err, workers) => {
                        if (err) {
                            return xcallback(err);
                        }
                        const this_worker_lstatus = workers
                            .filter(x => x.name === this.name)
                            .map(x => x.lstatus)[0];
                        if (this_worker_lstatus != intf.CONSTS.WorkerLStatus.leader) {
                            // this worker is not marked as leader, abort leadership
                            perform_loop = false;
                            this.is_leader = false;
                            return xcallback();
                        }

                        const this_worker_status = workers
                            .filter(x => x.name === this.name)
                            .map(x => x.status)[0];
                        if (this_worker_status != intf.CONSTS.WorkerStatus.alive) {
                            // this worker is not marked as alive, abort leadership
                            perform_loop = false;
                            this.is_leader = false;
                            return this.storage.setWorkerLStatus(
                                this.name, intf.CONSTS.WorkerLStatus.normal, xcallback);
                        }

                        alive_workers = workers
                            .filter(x => x.status === intf.CONSTS.WorkerStatus.alive);
                        const dead_workers = workers
                            .filter(x => x.status === intf.CONSTS.WorkerStatus.dead)
                            .map(x => x.name);
                        async.each(
                            dead_workers,
                            (dead_worker: string, ycallback) => {
                                this.handleDeadWorker(dead_worker, ycallback);
                            },
                            xcallback
                        );
                    });
                },
                xcallback => {
                    if (!perform_loop) {
                        return xcallback();
                    }
                    // retrieve list of topologies and their statuses
                    this.storage.getTopologyStatus((err, topologies_all) => {
                        if (err) {
                            return xcallback(err);
                        }
                        topologies_disabled = topologies_all.filter(x => !x.enabled);
                        topologies_enabled = topologies_all.filter(x => x.enabled);
                        xcallback();
                    });
                },
                xcallback => {
                    if (!perform_loop) {
                        return xcallback();
                    }
                    // Check enabled topologies - if they are marked as running, they must be assigned to worker
                    this.handleSuspiciousTopologies(topologies_enabled, topologies_disabled, xcallback);
                },
                xcallback => {
                    if (!perform_loop || alive_workers.length == 0) {
                        return xcallback();
                    }
                    // go through all enabled topologies and calculate current loads for workers
                    this.assignUnassignedTopologies(
                        topologies_enabled, topologies_for_rebalance,
                        alive_workers, worker_weights, xcallback);
                },
                xcallback => {
                    if (!perform_loop || alive_workers.length == 0) {
                        return xcallback();
                    }
                    // check if occasional rebalancing needs to be performed
                    if (this.is_leader) {
                        this.performRebalanceIfNeeded(alive_workers, topologies_for_rebalance, xcallback);
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
        topologies_enabled: intf.ITopologyStatus[],
        topologies_disabled: intf.ITopologyStatus[],
        callback: intf.SimpleCallback) {

        const targets = topologies_enabled
            .filter(x => x.status == intf.CONSTS.TopologyStatus.running && x.worker == null);
        async.each(targets, (item: intf.ITopologyStatus, xcallback) => {
            // strange, topology marked as enabled and running, but no worker specified
            // mark it as unassinged.
            log.logger().important(this.log_prefix +
                "Topology marked as running and enabled, but no worker specified: " + item.uuid);
            this.storage.setTopologyStatus(item.uuid, null, intf.CONSTS.TopologyStatus.unassigned, null, err => {
                if (err) {
                    return xcallback(err);
                }
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
        topologies_enabled: intf.ITopologyStatus[],
        topologies_for_rebalance: lb.ITopology[],
        alive_workers: intf.IWorkerStatus[],
        worker_weights: Map<string, number>,
        callback: intf.SimpleCallback) {

        topologies_enabled.forEach(x => {
            x.weight = x.weight || 1;
            x.worker_affinity = x.worker_affinity || [];
            if (x.status == intf.CONSTS.TopologyStatus.running) {
                for (const worker of alive_workers) {
                    const name = worker.name;
                    if (name == x.worker) {
                        const old_weight = (worker_weights.has(name) ? worker_weights.get(name) : 0);
                        worker_weights.set(name, old_weight + x.weight);
                        break;
                    }
                }
            }
            topologies_for_rebalance.push({
                affinity: x.worker_affinity,
                forced_affinity: [],
                uuid: x.uuid,
                weight: x.weight,
                worker: x.worker
            });
        });

        const unassigned_topologies = topologies_enabled
            .filter(x => x.status === intf.CONSTS.TopologyStatus.unassigned);
        if (unassigned_topologies.length > 0) {
            log.logger().important(this.log_prefix +
                "Found unassigned topologies: " + JSON.stringify(unassigned_topologies));
        }
        // assign unassigned topologies
        const load_balancer = new lb.LoadBalancerEx(
            alive_workers.map(x => {
                return { name: x.name, weight: worker_weights.get(x.name) || 0 };
            }),
            AFFINITY_FACTOR // affinity means N-times stronger gravitational pull towards that worker
        );
        const assignments = unassigned_topologies
            .map(x => {
                const worker = load_balancer.next(x.worker_affinity, x.weight);
                topologies_for_rebalance
                    .filter(y => y.uuid == x.uuid)
                    .forEach(y => { y.worker = worker; });
                return { uuid: x.uuid, worker };
            });

        // group assignments by worker
        const tasks = [];
        const workers = Array.from(new Set(assignments.map(a => a.worker)));
        for (const worker of workers) {
            const worker_assignments = assignments.filter(a => a.worker == worker);
            const uuids = worker_assignments.map(a => a.uuid);
            tasks.push({ worker, uuids });
        }
        async.each(
            tasks,
            (task, xcallback) => {
                this.assignTopologiesToWorker(task.worker, task.uuids, xcallback);
            },
            callback);
    }

    /** This method will perform rebalance of topologies on workers if needed.
     */
    private performRebalanceIfNeeded(workers: intf.IWorkerStatus[], topologies: lb.ITopology[], callback) {
        if (this.next_rebalance > Date.now()) {
            return callback();
        }
        this.next_rebalance = Date.now() + REBALANCE_INTERVAL;
        if (!workers || workers.length == 0) {
            return callback();
        }
        if (!topologies || topologies.length == 0) {
            return callback();
        }
        const load_balancer = new lb.LoadBalancerEx(
            workers.map(x => {
                return {
                    name: x.name,
                    weight: topologies
                        .filter(y => y.worker == x.name) // running on this worker
                        .map(y => y.weight)              // get their weights
                        .reduce((prev, curr) => prev + curr, 0) // sum the weights
                };
            }),
            AFFINITY_FACTOR
        );
        const steps = load_balancer.rebalance(topologies);
        // group rebalancing by old worker
        const rebalance_tasks = [];
        const workers_old = Array.from(new Set(steps.changes.map(change => change.worker_old)));
        for (const worker_old of workers_old) {
            const worker_changes = steps.changes.filter(change => change.worker_old == worker_old);
            const stop_topologies = worker_changes.map(change => {
                return { uuid: change.uuid, worker_new: change.worker_new };
            });
            rebalance_tasks.push({ worker_old, stop_topologies });
        }
        async.each(
            rebalance_tasks,
            (rebalance_task, xcallback) => {
                log.logger().important(this.log_prefix + `Rebalancing - moving topologies ` +
                    `from worker ${rebalance_task.worker_old}` +
                    `: ${rebalance_task.stop_topologies.map(x => x.uuid + " -> " + x.worker_new).join(", ")}`);
                this.storage.sendMessageToWorker(
                    rebalance_task.worker_old,
                    intf.CONSTS.LeaderMessages.stop_topologies,
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
        log.logger().important(this.log_prefix + "Handling dead worker " + dead_worker);
        this.storage.getTopologiesForWorker(dead_worker, (err, topologies) => {
            async.each(
                topologies,
                (topology, xcallback) => {
                    log.logger().important(this.log_prefix + "Unassigning topology " + topology.uuid);
                    if (topology.status == intf.CONSTS.TopologyStatus.error) {
                        // this status must stay as it is
                        xcallback();
                    } else {
                        this.storage.setTopologyStatus(
                            topology.uuid, null,
                            intf.CONSTS.TopologyStatus.unassigned, null, xcallback);
                    }
                },
                (err_inner: Error) => {
                    if (err_inner) {
                        log.logger().important(this.log_prefix + "Error while handling dead worker " + err_inner);
                        return callback(err_inner);
                    }
                    log.logger().important(this.log_prefix + "Setting dead worker as unloaded: " + dead_worker);
                    this.storage.setWorkerStatus(dead_worker, intf.CONSTS.WorkerStatus.unloaded, callback);
                }
            );
        });
    }

    /** Checks single worker record and de-activates it if needed. */
    private disableDefunctWorkerSingle(worker: intf.IWorkerStatus, callback: intf.SimpleCallback) {
        const limit = Date.now() - WORKER_IDLE_INTERVAL;
        async.series(
            [
                xcallback => {
                    // nothing to do for dead and unloaded workers
                    if (worker.status == intf.CONSTS.WorkerStatus.dead ||
                        worker.status == intf.CONSTS.WorkerStatus.unloaded) { return xcallback(); }
                    // nothing to do for workers that pinged recently
                    if (worker.last_ping >= limit) { return xcallback(); }
                    // unresponsive worker found
                    log.logger().important(this.log_prefix +
                        `Reporting live worker ${worker.name} as dead ` +
                        `(sec since ping: ${(Date.now() - worker.last_ping) / 1000})`);
                    worker.status = intf.CONSTS.WorkerStatus.dead;
                    // TODO what if worker just had an old PING when starting two servers simultaneously?
                    // TODO what if worker timed out, but comes back? Should we change it's status to live?
                    // TODO how can leadership loop run when worker is dead?
                    this.storage.setWorkerStatus(worker.name, worker.status, xcallback);
                },
                xcallback => {
                    // only alive workers can be leaders
                    if (
                        worker.lstatus != intf.CONSTS.WorkerLStatus.normal &&
                        worker.status != intf.CONSTS.WorkerStatus.alive
                    ) {
                        log.logger().important(this.log_prefix +
                            `Reporting worker ${worker.name} leadership as normal (before leadership was ` +
                            `${intf.CONSTS.WorkerLStatus[worker.lstatus]}, worker was ` +
                            `${intf.CONSTS.WorkerStatus[worker.status]})`);
                        worker.lstatus = intf.CONSTS.WorkerLStatus.normal;
                        this.storage.setWorkerLStatus(worker.name, worker.lstatus, xcallback);
                    } else {
                        xcallback();
                    }
                }
            ],
            callback
        );
    }

    /** checks all worker records if any of them is not active anymore. */
    private disableDefunctWorkers(data_workers: intf.IWorkerStatus[], callback: intf.SimpleCallback) {
        async.each(
            data_workers,
            (worker: intf.IWorkerStatus, xcallback) => {
                this.disableDefunctWorkerSingle(worker, xcallback);
            },
            callback
        );
    }

    /** Detaches toplogies from inactive workers */
    private unassignWaitingTopologies(data_workers: intf.IWorkerStatus[], callback: intf.SimpleCallback) {
        const dead_workers = data_workers
            .filter(x => x.status == intf.CONSTS.WorkerStatus.dead || x.status == intf.CONSTS.WorkerStatus.unloaded)
            .map(x => x.name);
        this.storage.getTopologyStatus((err, data) => {
            if (err) {
                return callback(err);
            }
            const limit = Date.now() - WORKER_IDLE_INTERVAL;
            async.each(
                data,
                (topology: intf.ITopologyStatus, xcallback) => {
                    if (
                        topology.status == intf.CONSTS.TopologyStatus.waiting &&
                        topology.last_ping < limit
                    ) {
                        log.logger().important(this.log_prefix +
                            `Unassigning waiting topology ${topology.uuid} (sec since ping: ` +
                            `${(Date.now() - topology.last_ping) / 1000})`);
                        this.storage.setTopologyStatus(
                            topology.uuid, null,
                            intf.CONSTS.TopologyStatus.unassigned, null, xcallback);
                    } else if (
                        topology.status == intf.CONSTS.TopologyStatus.running &&
                        dead_workers.indexOf(topology.worker) >= 0
                    ) {
                        log.logger().important(this.log_prefix +
                            `Unassigning running topology ${topology.uuid} on a dead worker ${topology.worker}`);
                        this.storage.setTopologyStatus(
                            topology.uuid, null,
                            intf.CONSTS.TopologyStatus.unassigned, null, xcallback);
                    } else {
                        xcallback();
                    }
                },
                callback
            );
        });
    }

    /** Gets and refreshes worker statuses */
    private refreshStatuses(callback: intf.SimpleResultCallback<IRefreshStatusesResult>) {
        let workers: intf.IWorkerStatus[] = null;
        const res: IRefreshStatusesResult = {
            leadership_status: intf.CONSTS.LeadershipStatus.vacant,
            own_lstatus: null,
            own_status: null
        };
        async.series(
            [
                xcallback => {
                    this.storage.getWorkerStatus((err, data) => {
                        if (err) {
                            return xcallback(err);
                        }
                        workers = data;
                        const own_data = workers
                            .filter(x => x.name == this.name);
                        if (own_data.length > 0) {
                            res.own_status = own_data[0].status;
                            res.own_lstatus = own_data[0].lstatus;
                        }
                        xcallback();
                    });
                },
                xcallback => {
                    this.disableDefunctWorkers(workers, xcallback);
                },
                xcallback => {
                    this.unassignWaitingTopologies(workers, xcallback);
                },
                xcallback => {
                    const leader_cnt = workers
                        .filter(x => x.lstatus == intf.CONSTS.WorkerLStatus.leader)
                        .length;
                    if (leader_cnt > 0) {
                        res.leadership_status = intf.CONSTS.LeadershipStatus.ok;
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
