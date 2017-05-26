import * as intf from "../topology_interfaces";
/**
 * This class acts as a proxy for local topology inside parent process.
 */
export declare class TopologyLocalProxy {
    private init_cb;
    private run_cb;
    private pause_cb;
    private shutdown_cb;
    private was_shut_down;
    private child_exit_callback;
    private child;
    /** Constructor that sets up call routing */
    constructor(child_exit_callback: intf.SimpleCallback);
    /** Check if this object has been shut down already */
    wasShutDown(): boolean;
    /** Calls all pending callbacks with given error and clears them. */
    private callPendingCallbacks(e);
    /** Calls pending shutdown callback with given error and clears it. */
    private callPendingCallbacks2(e);
    /** Sends initialization signal to underlaying process */
    init(config: any, callback: intf.SimpleCallback): void;
    /** Sends run signal to underlaying process */
    run(callback: intf.SimpleCallback): void;
    /** Sends pause signal to underlaying process */
    pause(callback: intf.SimpleCallback): void;
    /** Sends shutdown signal to underlaying process */
    shutdown(callback: intf.SimpleCallback): void;
    /** Internal method for sending messages to child process */
    private send(code, data);
}
