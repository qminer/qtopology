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
        async.whilst(() => { return self.isRunning; }, (xcallback) => {
            setTimeout(function () {
                if (self.isLeader) {
                    self.performLeaderLoop(xcallback);
                }
                else {
                    self.checkIfLeader(xcallback);
                }
            }, self.loopTimeout);
        }, (err) => {
            console.log("[Leader] Leader shutdown finished.");
            if (self.shutdownCallback) {
                self.shutdownCallback(err);
            }
        });
    }
    /** Shut down the loop */
    shutdown(callback) {
        let self = this;
        self.shutdownCallback = callback;
        self.isRunning = false;
    }
    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    checkIfLeader(callback) {
        let self = this;
        self.storage.getLeadershipStatus((err, res) => {
            if (err)
                return callback(err);
            if (res.leadership == "ok")
                return callback();
            if (res.leadership == "pending")
                return callback();
            // status is vacant
            self.storage.announceLeaderCandidacy(self.name, (err) => {
                if (err)
                    return callback(err);
                self.storage.checkLeaderCandidacy(self.name, (err, is_leader) => {
                    if (err)
                        return callback(err);
                    self.isLeader = is_leader;
                    if (self.isLeader) {
                        console.log("[Leader] This worker became a leader...");
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
    performLeaderLoop(callback) {
        let self = this;
        let alive_workers = null;
        async.series([
            (xcallback) => {
                self.storage.getWorkerStatus((err, workers) => {
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
                        self.handleDeadWorker(dead_worker, xxcallback);
                    }, xcallback);
                });
            },
            (xcallback) => {
                if (alive_workers.length == 0) {
                    return xcallback();
                }
                self.storage.getTopologyStatus((err, topologies) => {
                    if (err)
                        return xcallback(err);
                    // each topology: name, status
                    // possible statuses: unassigned, waiting, running, error, stopped
                    let unassigned_topologies = topologies
                        .filter(x => x.status === "unassigned" || x.status === "stopped")
                        .map(x => x.uuid);
                    if (unassigned_topologies.length > 0) {
                        console.log("[Leader] Found unassigned topologies:", unassigned_topologies);
                    }
                    let load_balancer = new lb.LoadBalancer(alive_workers.map(x => { return { name: x.name, weight: x.topology_count }; }));
                    async.each(unassigned_topologies, (unassigned_topology, xxcallback) => {
                        let target = load_balancer.next();
                        console.log(`[Leader] Assigning topology ${unassigned_topology} to worker ${target}`);
                        self.storage.assignTopology(unassigned_topology, target, xxcallback);
                    }, xcallback);
                });
            }
        ], callback);
    }
    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    handleDeadWorker(dead_worker, callback) {
        console.log("[Leader] Handling dead worker", dead_worker);
        let self = this;
        self.storage.getTopologiesForWorker(dead_worker, (err, topologies) => {
            async.each(topologies, (topology, xcallback) => {
                console.log("[Leader] Unassigning topology", topology.uuid);
                self.storage.setTopologyStatus(topology.uuid, "unassigned", null, xcallback);
            }, (err) => {
                if (err) {
                    console.log("[Leader] Error while handling dead worker", err);
                    return callback(err);
                }
                console.log("[Leader] Setting dead worker as unloaded", dead_worker);
                self.storage.setWorkerStatus(dead_worker, "unloaded", callback);
            });
        });
    }
}
exports.TopologyLeader = TopologyLeader;
//# sourceMappingURL=topology_leader.js.map