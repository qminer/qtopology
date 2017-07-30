/// <reference types="node" />
import * as EventEmitter from "events";
import * as intf from "../topology_interfaces";
/** This class handles communication with topology coordination storage.
 */
export declare class TopologyCoordinator extends EventEmitter {
    private storage;
    private name;
    private isRunning;
    private shutdownCallback;
    private loopTimeout;
    private leadership;
    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage);
    /** Runs main loop */
    run(): void;
    /** Shut down the loop */
    preShutdown(callback: intf.SimpleCallback): void;
    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback): void;
    /** Set status on given topology */
    reportTopology(uuid: string, status: string, error: string, callback?: intf.SimpleCallback): void;
    /** Set status on given worker */
    reportWorker(name: string, status: string, error: string, callback?: intf.SimpleCallback): void;
    /** This method checks for new messages from coordination storage. */
    private handleIncommingRequests(callback);
    /** This method checks if all topologies, assigned to this worker, actually run. */
    private checkAssignedTopologies(callback);
}
