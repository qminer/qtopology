"use strict";
var async = require("async");
var lb = require("../util/load_balance");
/** This class handles leader-status determination and
 * performs leadership tasks if marked as leader.
 */
var TopologyLeader = (function () {
    /** Simple constructor */
    function TopologyLeader(options) {
        this._storage = options.storage;
        this._name = options.name;
        this._isRunning = false;
        this._shutdownCallback = null;
        this._isLeader = false;
        this._loopTimeout = 3 * 1000; // 3 seconds for refresh
    }
    /** Runs main loop that handles leadership detection */
    TopologyLeader.prototype.run = function () {
        var self = this;
        self._isRunning = true;
        async.whilst(function () { return self._isRunning; }, function (xcallback) {
            setTimeout(function () {
                if (self._isLeader) {
                    self._performLeaderLoop(xcallback);
                }
                else {
                    self._checkIfLeader(xcallback);
                }
            }, self._loopTimeout);
        }, function (err) {
            console.log("Leader shutdown finished.");
            if (self._shutdownCallback) {
                self._shutdownCallback(err);
            }
        });
    };
    /** Shut down the loop */
    TopologyLeader.prototype.shutdown = function (callback) {
        var self = this;
        self._shutdownCallback = callback;
        self._isRunning = false;
    };
    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    TopologyLeader.prototype._checkIfLeader = function (callback) {
        var self = this;
        self._storage.getLeadershipStatus(function (err, res) {
            if (err)
                return callback(err);
            if (res.leadership_status == "ok")
                return callback();
            if (res.leadership_status == "pending")
                return callback();
            // status is vacant
            self._storage.announceLeaderCandidacy(self._name, function (err) {
                if (err)
                    return callback(err);
                self._storage.checkLeaderCandidacy(self._name, function (err, is_leader) {
                    if (err)
                        return callback(err);
                    self._isLeader = is_leader;
                    if (self._isLeader) {
                        console.log("This worker became a leader...");
                    }
                    callback();
                });
            });
        });
    };
    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    TopologyLeader.prototype._performLeaderLoop = function (callback) {
        var self = this;
        var alive_workers = null;
        async.series([
            function (xcallback) {
                self._storage.getWorkerStatus(function (err, workers) {
                    if (err)
                        return xcallback(err);
                    // each worker: name, status, topology_count
                    // possible statuses: alive, dead, unloaded
                    var dead_workers = workers
                        .filter(function (x) { return x.status === "dead"; })
                        .map(function (x) { return x.name; });
                    alive_workers = workers
                        .filter(function (x) { return x.status === "alive"; });
                    if (alive_workers.length == 0) {
                        return xcallback();
                    }
                    async.each(dead_workers, function (dead_worker, xxcallback) {
                        self._handleDeadWorker(dead_worker, xxcallback);
                    }, xcallback);
                });
            },
            function (xcallback) {
                if (alive_workers.length == 0) {
                    return xcallback();
                }
                self._storage.getTopologyStatus(function (err, topologies) {
                    if (err)
                        return xcallback(err);
                    // each topology: name, status
                    // possible statuses: unassigned, waiting, running, error, stopped
                    var unassigned_topologies = topologies
                        .filter(function (x) { return x.status === "unassigned" || x.status === "stopped"; })
                        .map(function (x) { return x.uuid; });
                    if (unassigned_topologies.length > 0) {
                        console.log("Found unassigned topologies:", unassigned_topologies);
                    }
                    var load_balancer = new lb.LoadBalancer(alive_workers.map(function (x) { return { name: x.name, weight: x.topology_count }; }));
                    async.each(unassigned_topologies, function (unassigned_topology, xxcallback) {
                        var target = load_balancer.next();
                        console.log("Assigning topology " + unassigned_topology + " to worker " + target);
                        self._storage.assignTopology(unassigned_topology, target, xxcallback);
                    }, xcallback);
                });
            }
        ], callback);
    };
    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    TopologyLeader.prototype._handleDeadWorker = function (dead_worker, callback) {
        console.log("Handling dead worker", dead_worker);
        var self = this;
        self._storage.getTopologiesForWorker(dead_worker, function (err, topologies) {
            async.each(topologies, function (topology, xcallback) {
                console.log("Unassigning topology", topology.uuid);
                self._storage.setTopologyStatus(topology.uuid, "unassigned", null, xcallback);
            }, function (err) {
                if (err) {
                    console.log("Error while handling dead worker", err);
                    return callback(err);
                }
                console.log("Setting dead worker as unloaded", dead_worker);
                self._storage.setWorkerStatus(dead_worker, "unloaded", callback);
            });
        });
    };
    return TopologyLeader;
}());
exports.TopologyLeader = TopologyLeader;
