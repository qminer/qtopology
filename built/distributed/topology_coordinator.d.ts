import * as intf from "../topology_interfaces";
/** Interface for objects that coordinator needs to communicate with. */
export interface TopologyCoordinatorClient {
    /** Object needs to start given topology */
    startTopology(uuid: string, config: any, callback: intf.SimpleCallback): void;
    /** Object needs to stop given topology */
    stopTopology(uuid: string, callback: intf.SimpleCallback): void;
    /** Object should stop all topologies */
    stopAllTopologies(callback: intf.SimpleCallback): void;
    /** Object needs to kill given topology */
    killTopology(uuid: string, callback: intf.SimpleCallback): void;
    /** Object should resolve differences between running topologies and the given list. */
    resolveTopologyMismatches(uuids: string[], callback: intf.SimpleCallback): void;
    /** Object should shut down */
    shutdown(callback: intf.SimpleCallback): void;
    /** Process exit wrapper */
    exit(code: number): void;
    /** Check if current time is in dormancy period */
    is_dormant_period(): boolean;
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
    private pingIntervalId;
    private pingInterval;
    private current_dormancy_state;
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
    reportWorker(name: string, status: string, callback?: intf.SimpleCallback): void;
    /** Handle single request */
    private handleSingleRequest;
    /** This method checks for new messages from coordination storage. */
    private handleIncommingRequests;
    /** This method marks this worker as disabled. */
    setAsDisabled(callback: intf.SimpleCallback): void;
    /** This method checks current status for this worker.
     * It might happen that leader marked it as dead (e.g. pings were not
     * comming into db for some time), but this worker is actually still alive.
     * The worker must announce that it is available. The leader will then
     * handle the topologies appropriatelly.
     */
    private checkWorkerStatus;
    /** This method checks if all topologies, assigned to this worker, actually run. */
    private checkAssignedTopologies;
    private setPingInterval;
}
