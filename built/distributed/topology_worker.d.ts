import * as intf from "../topology_interfaces";
/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
export declare class TopologyWorker {
    private name;
    private overrides;
    private coordinator;
    private topologies;
    /** Initializes this object */
    constructor(name: string, storage: intf.CoordinationStorage, overrides?: object);
    /** Starts this worker */
    run(): void;
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
}
