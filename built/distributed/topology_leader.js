"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const lb = require("../util/load_balance");
/** This class handles leader-status determination and
 * performs leadership tasks if marked as leader.
 */
class TopologyLeader {
    /** Simple constructor */
    constructor(name, storage) {
        this._storage = storage;
        this._name = name;
        this._isRunning = false;
        this._shutdownCallback = null;
        this._isLeader = false;
        this._loopTimeout = 3 * 1000; // 3 seconds for refresh
    }
    /** Runs main loop that handles leadership detection */
    run() {
        let self = this;
        self._isRunning = true;
        async.whilst(() => { return self._isRunning; }, (xcallback) => {
            setTimeout(function () {
                if (self._isLeader) {
                    self._performLeaderLoop(xcallback);
                }
                else {
                    self._checkIfLeader(xcallback);
                }
            }, self._loopTimeout);
        }, (err) => {
            console.log("Leader shutdown finished.");
            if (self._shutdownCallback) {
                self._shutdownCallback(err);
            }
        });
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
        self._storage.getLeadershipStatus((err, res) => {
            if (err)
                return callback(err);
            if (res.leadership == "ok")
                return callback();
            if (res.leadership == "pending")
                return callback();
            // status is vacant
            self._storage.announceLeaderCandidacy(self._name, (err) => {
                if (err)
                    return callback(err);
                self._storage.checkLeaderCandidacy(self._name, (err, is_leader) => {
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
    }
    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    _performLeaderLoop(callback) {
        let self = this;
        let alive_workers = null;
        async.series([
            (xcallback) => {
                self._storage.getWorkerStatus((err, workers) => {
                    if (err)
                        return xcallback(err);
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
                    async.each(dead_workers, (dead_worker, xxcallback) => {
                        self._handleDeadWorker(dead_worker, xxcallback);
                    }, xcallback);
                });
            },
            (xcallback) => {
                if (alive_workers.length == 0) {
                    return xcallback();
                }
                self._storage.getTopologyStatus((err, topologies) => {
                    if (err)
                        return xcallback(err);
                    // each topology: name, status
                    // possible statuses: unassigned, waiting, running, error, stopped
                    let unassigned_topologies = topologies
                        .filter(x => x.status === "unassigned" || x.status === "stopped")
                        .map(x => x.uuid);
                    if (unassigned_topologies.length > 0) {
                        console.log("Found unassigned topologies:", unassigned_topologies);
                    }
                    let load_balancer = new lb.LoadBalancer(alive_workers.map(x => { return { name: x.name, weight: x.topology_count }; }));
                    async.each(unassigned_topologies, (unassigned_topology, xxcallback) => {
                        let target = load_balancer.next();
                        console.log(`Assigning topology ${unassigned_topology} to worker ${target}`);
                        self._storage.assignTopology(unassigned_topology, target, xxcallback);
                    }, xcallback);
                });
            }
        ], callback);
    }
    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    _handleDeadWorker(dead_worker, callback) {
        console.log("Handling dead worker", dead_worker);
        let self = this;
        self._storage.getTopologiesForWorker(dead_worker, (err, topologies) => {
            async.each(topologies, (topology, xcallback) => {
                console.log("Unassigning topology", topology.uuid);
                self._storage.setTopologyStatus(topology.uuid, "unassigned", null, xcallback);
            }, (err) => {
                if (err) {
                    console.log("Error while handling dead worker", err);
                    return callback(err);
                }
                console.log("Setting dead worker as unloaded", dead_worker);
                self._storage.setWorkerStatus(dead_worker, "unloaded", callback);
            });
        });
    }
}
exports.TopologyLeader = TopologyLeader;
//# sourceMappingURL=topology_leader.js.map