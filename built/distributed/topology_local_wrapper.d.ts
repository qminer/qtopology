/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
export declare class TopologyLocalWrapper {
    private uuid;
    private process;
    private topology_local;
    private waiting_for_shutdown;
    private log_prefix;
    private lastPing;
    private pingIntervalId;
    /** Constructor that sets up call routing */
    constructor(proc: any);
    /** Starts infinite loop by reading messages from parent or console */
    start(): void;
    /** Internal main handler for incoming messages */
    private handle(msg);
    private killProcess(exit_code?, err?);
    /** This method shuts down the local topology.
     * Any bolt/spout shutdown exception `err` will be propagated
     * to this method and will result in calling self.killProcess(shutdown_internal_error, err)
     */
    private shutdown();
    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    private sendToParent(cmd, data);
}
