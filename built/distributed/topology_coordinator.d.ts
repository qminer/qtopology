import * as intf from "../topology_interfaces";
/** Interface for objects that coordinator needs to communicate with. */
export interface TopologyCoordinatorClient {
    /** Obejct needs to start given topology */
    startTopology(uuid: string, config: any, callback: intf.SimpleCallback): any;
    /** Object needs to stop given topology */
    stopTopology(uuid: string, callback: intf.SimpleCallback): any;
    /** Object needs to kill given topology */
    killTopology(uuid: string, callback: intf.SimpleCallback): any;
    /** Object should resolve differences between running topologies and the given list. */
    resolveTopologyMismatches(uuids: string[], callback: intf.SimpleCallback): any;
    /** Object should shut down */
    shutdown(callback: intf.SimpleCallback): any;
    /** Process exit wrapper */
    exit(code: number): any;
}
/** This class handles communication with topology coordination storage.
 */
export declare class TopologyCoordinator {
    private storage;
    private client;
    private name;
    private is_shutting_down;
    private is_running;
    private shutdown_callback;
    private loop_timeout;
    private leadership;
    private start_time;
    private log_prefix;
    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage, client: TopologyCoordinatorClient);
    /** Runs main loop */
    run(): void;
    /** Shut down the loop */
    preShutdown(callback: intf.SimpleCallback): void;
    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback): void;
    /** Set status on given topology */
    reportTopology(uuid: string, status: string, error: string, callback?: intf.SimpleCallback): void;
    /** Set pid on given topology */
    reportTopologyPid(uuid: string, pid: number, callback?: intf.SimpleCallback): void;
    /** Set status on given worker */
    reportWorker(name: string, status: string, error: string, callback?: intf.SimpleCallback): void;
    /** This method checks for new messages from coordination storage. */
    private handleIncommingRequests(callback);
    /** This method checks if all topologies, assigned to this worker, actually run. */
    private checkAssignedTopologies(callback);
}
