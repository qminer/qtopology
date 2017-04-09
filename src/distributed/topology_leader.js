"use strict";

const async = require("async");
const lb = require("../util/load_balance");

/** This class handles leader-status determination and
 * performs leadership tasks if marked as leader.
 */
class TopologyLeader {

    /** Simple constructor */
    constructor(options) {
        this._storage = options.storage;
        this._name = options.name;
        this._isRunning = false;
        this._shutdownCallback = null;
        this._isLeader = false;
        this._loopTimeout = 3 * 1000; // 3 seconds for refresh
    }

    /** Runs main loop that handles leadership detection */
    run() {
        let self = this;
        self._isRunning = true;
        async.whilst(
            () => { return self._isRunning; },
            (xcallback) => {
                setTimeout(function () {
                    if (self._isLeader) {
                        self._performLeaderLoop(xcallback);
                    } else {
                        self._checkIfLeader(xcallback);
                    }
                }, self._loopTimeout);
            },
            (err) => {
                if (self._shutdownCallback) {
                    self._shutdownCallback(err);
                }
            }
        );
    }

    /** Shut down the loop */
    shutdown(callback) {
        let self = this;
        self._shutdownCallback = callback;
        self._isRunning = false;
    }

    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    _checkIfLeader(callback) {
        let self = this;
        self._storage.getLeadershipStatus((err, status) => {
            if (err) return callback(err);
            if (status == "ok") return callback();
            if (status == "pending") return callback();
            // status is vacant
            self._storage.announceLeaderCandidacy(self.name, (err) => {
                setTimeout(() => {
                    self._storage.checkLeaderCandidacy(self.name, (err, is_leader) => {
                        if (err) return callback(err);
                        self._isLeader = is_leader;
                        callback();
                    });
                }, 200 + 200 * Math.random()); // wait between 200 and 400 msec
            });
        });
    }

    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    _performLeaderLoop(callback) {
        let self = this;
        let alive_workers = null;
        let load_balancer = null;
        async.series(
            [
                (xcallback) => {
                    self._storage.getWorkerStatus((err, workers) => {
                        if (err) return xcallback(err);
                        // each worker: name, status, topology_count
                        // possible statuses: alive, dead, unloaded
                        let dead_workers = workers
                            .filter(x => x.status === "dead")
                            .map(x => x.name);
                        alive_workers = workers
                            .filter(x => x.status === "alive");
                        load_balancer = new lb.LoadBalancer(
                            alive_workers.map(x => { return { name: name, weight: topology_count }; })
                        );
                        async.each(
                            dead_workers,
                            (dead_worker, xxcallback) => {
                                self._handleDeadWorker(dead_worker, load_balancer, xxcallback);
                            },
                            xcallback
                        );
                    });
                },
                (xcallback) => {
                    self._storage.getTopologyStatus((err, topologies) => {
                        if (err) return xcallback(err);
                        // each topology: name, status
                        // possible statuses: unassigned, waiting, running, error, stopped
                        let unassigned_topologies = topologies
                            .filter(x => x.status === "unassigned")
                            .map(x => x.uuid);
                        async.each(
                            unassigned_topologies,
                            (unassigned_topology, xxcallback) => {
                                self._storage.assignTopology(topology, load_balancer.next(), xcallback);
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
    _handleDeadWorker(dead_worker, load_balancer, callback) {
        let self = this;
        self._storage.getTopologiesForWorker(dead_worker, (err, topologies) => {
            async.each(
                topologies,
                (topology, xcallback) => {
                    self._storage.assignTopology(topology.uuid, load_balancer.next(), xcallback);
                },
                callback
            );
        });
    }
}

exports.TopologyLeader = TopologyLeader;
