import * as intf from "../topology_interfaces";
/** This class handles leader-status determination and
 * performs leadership tasks if marked as leader.
 */
export declare class TopologyLeader {
    private storage;
    private name;
    private isRunning;
    private isLeader;
    private shutdownCallback;
    private loopTimeout;
    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage);
    /** Runs main loop that handles leadership detection */
    run(): void;
    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback): void;
    /** Single step in checking if current node should be
     * promoted into leadership role.
     **/
    private checkIfLeader(callback);
    /** Single step in performing leadership role.
     * Checks work statuses and redistributes topologies for dead
     * to alive workers.
     */
    private performLeaderLoop(callback);
    /** Handles situation when there is a dead worker and its
     * topologies need to be re-assigned to other servers.
     */
    private handleDeadWorker(dead_worker, callback);
}
