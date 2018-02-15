import * as intf from "../topology_interfaces";
/** Definition of parameters for creatio0n of new worker object */
export interface TopologyWorkerParams {
    /** Worker name */
    name: string;
    /** Storage object to use */
    storage: intf.CoordinationStorage;
    /** Additional data inside an object that is injected into each topology definition. Optional. */
    overrides?: object;
    /** Optional function that tests if the worker should be dormant. */
    is_dormant_period?: () => boolean;
}
/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
export declare class TopologyWorker {
    private log_prefix;
    private overrides;
    private coordinator;
    private topologies;
    private waiting_for_shutdown;
    private is_dormant_period;
    /** Initializes this object */
    constructor(options: TopologyWorkerParams);
    /** Internal wrapper around process.exit */
    private exit(code);
    /** Starts this worker */
    run(): void;
    /** This method verifies that all topologies are running and properly registered */
    private resolveTopologyMismatches(uuids, callback);
    /** Internal method ensures that a topology exits. */
    private ensureExit(rec, err?);
    /** Internal method that creates proxy for given topology item */
    private createInitAndRunProxy(rec, callback);
    /** Starts single topology.
     * Guards itself from duplicated calls.
     */
    private start(uuid, config, callback);
    private hasTopology(uuid);
    /** This method injects override values into variables section of the configuration. */
    private injectOverrides(config);
    /** Remove specified topology from internal list */
    private removeTopology(uuid);
    /** Shuts down the worker and all its subprocesses.
     * Does not pass any exceptions, only logs them.
     */
    shutdown(callback: intf.SimpleCallback): void;
    /** Sends shutdown signals to all topologies. Will try to shutdown
     * all topologies and log any failures.
     */
    private shutDownTopologies(callback);
    /** Sends shut down signal to single topology */
    private shutDownTopology(uuid, do_kill, callback);
    /** Internal method that contains common steps for kill and shutdown sequence */
    private shutDownTopologyInternal(item, do_kill, callback);
    /** Remove given topology from internal list and report an error */
    private removeAndReportError(rec, err, callback);
}
