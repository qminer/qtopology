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
    /** Runs main loop that handles leadership detection */
    run(): void;
    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback): void;
    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    private checkIfLeaderDetermined(callback);
    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    private performLeaderLoop(callback);
    /** This method will perform rebalance of topologies on workers if needed.
     */
    private performRebalanceIfNeeded(workers, topologies, callback);
    /**
     * This method assigns topology to the worker that is provided by the load-balancer.
     * @param ut - unassigned toplogy object
     * @param load_balancer - load balancer object that tells you which worker to send the topology to
     * @param callback - callback to call when done
     */
    private assignUnassignedTopology(ut, load_balancer, callback);
    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    private handleDeadWorker(dead_worker, callback);
}
