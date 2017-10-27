import * as intf from "../topology_interfaces";
/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
export declare class TopologyWorker {
    private name;
    private log_prefix;
    private overrides;
    private coordinator;
    private topologies;
    private waiting_for_shutdown;
    /** Initializes this object */
    constructor(name: string, storage: intf.CoordinationStorage, overrides?: object);
    /** Starts this worker */
    run(): void;
    /** This method verifies that all topologies are running and properly registered */
    private resolveTopologyMismatches(uuids, callback);
    /** Internal method that creates proxy for given topology item */
    private createProxy(rec);
    /** Starts single topology */
    private start(uuid, config);
    /** This method injects override values into variables section of the configuration. */
    private injectOverrides(config);
    /** Remove specified topology from internal list */
    private removeTopology(uuid);
    /** Shuts down the worker and all its subprocesses. */
    shutdown(callback: intf.SimpleCallback): void;
    /** Sends shutdown signals to all topologies */
    private shutDownTopologies(callback);
    /** Sends shut down signal to single topology */
    private shutDownTopology(uuid, do_kill, callback);
    /** Internal method that contains common steps for kill and shutdown sequence */
    private shutDownTopologyInternal(item, do_kill, callback);
    /** Remove given topology from internal list and report an error */
    private removeAndReportError(rec, err);
}
