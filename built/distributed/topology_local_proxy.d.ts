import * as intf from "../topology_interfaces";
/**
 * This class acts as a proxy for local topology inside parent process.
 */
export declare class TopologyLocalProxy {
    private init_cb;
    private run_cb;
    private pause_cb;
    private shutdown_cb;
    private has_exited;
    private child_exit_callback;
    private child;
    private pingIntervalId;
    private sentPings;
    private log_prefix;
    private last_child_err;
    /** Constructor that sets up call routing */
    constructor(child_exit_callback: intf.SimpleCallback);
    /** Starts child process and sets up all event handlers */
    private setUpChildProcess(uuid);
    /** Check if this object has exited */
    hasExited(): boolean;
    /** Returns process PID */
    getPid(): number;
    /** Calls all pending callbacks with an exception
     * (process exited before receving callback) and
     * forwards the given error to child_exit_callback.
     * Also clears ping interval.
     */
    private onExit(e);
    /** Sends initialization signal to underlaying process */
    init(uuid: string, config: any, callback: intf.SimpleCallback): void;
    /** Sends run signal to underlaying process */
    run(callback: intf.SimpleCallback): void;
    /** Sends pause signal to underlaying process */
    pause(callback: intf.SimpleCallback): void;
    /** Sends shutdown signal to underlaying process */
    shutdown(callback: intf.SimpleCallback): void;
    /** Sends SIGKILL signal to underlaying process.
     * This is a last resort - the child should normally
     * exit after receiving shutdown signal.
     */
    kill(callback: intf.SimpleCallback): void;
    /** Internal method for sending messages to child process */
    private send(code, data);
}
