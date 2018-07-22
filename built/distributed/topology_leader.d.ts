import * as intf from "../topology_interfaces";
/** This class handles leader-status determination and
 * performs leadership tasks if marked as leader.
 */
export declare class TopologyLeader {
    private storage;
    private name;
    private is_running;
    private is_shut_down;
    private is_leader;
    private shutdown_callback;
    private loop_timeout;
    private next_rebalance;
    private log_prefix;
    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage, loop_timeout: number);
    /** Gets an indication if this instance is running. */
    isRunning(): boolean;
    /** Gets current value of indicator that this instance
     * has been elected a leader */
    isLeader(): boolean;
    /** Runs main loop that handles leadership detection */
    run(): void;
    /** Single step for loop - can be called form outside, for testing. */
    singleLoopStep(callback: intf.SimpleCallback): void;
    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback): void;
    /** Forces this leader to perform a rebalance the next time it runs its loop. */
    forceRebalance(): void;
    /** Sometimes outside code gets instruction to assign topology to specific worker. */
    assignTopologyToWorker(target: string, uuid: string, callback: intf.SimpleCallback): void;
    /** Sometimes outside code gets instruction to assign topologies to specific worker. */
    assignTopologiesToWorker(target: string, uuids: string[], callback: intf.SimpleCallback): void;
    /** This method sets status of this object to normal */
    releaseLeadership(callback: intf.SimpleCallback): void;
    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    private checkIfLeaderDetermined(callback);
    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    private performLeaderLoop(callback);
    /** Check enabled topologies - if they are marked as running, they must be assigned to worker */
    private handleSuspiciousTopologies(topologies_enabled, topologies_disabled, callback);
    /** go through all enabled topologies and calculate current loads for workers.
     * Then assign unassigned topologies to appropiate workers.
     */
    private assignUnassignedTopologies(topologies_enabled, topologies_for_rebalance, alive_workers, worker_weights, callback);
    /** This method will perform rebalance of topologies on workers if needed.
     */
    private performRebalanceIfNeeded(workers, topologies, callback);
    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    private handleDeadWorker(dead_worker, callback);
    /** Checks single worker record and de-activates it if needed. */
    private disableDefunctWorkerSingle(worker, callback);
    /** checks all worker records if any of them is not active anymore. */
    private disableDefunctWorkers(data_workers, callback);
    /** Detaches toplogies from inactive workers */
    private unassignWaitingTopologies(data_workers, callback);
    /** Gets and refreshes worker statuses */
    private refreshStatuses(callback);
    /** Utility function that resembles leadership - removes error flag for topology.
     * But it is not called within leader object.
     */
    static clearTopologyError(uuid: string, storage: intf.CoordinationStorage, callback: intf.SimpleCallback): void;
}
