import * as path from "path";
import * as cp from "child_process";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as deserialize_error from "deserialize-error";
import { tryCallback } from "../util/callback_wrappers";

// TODO: specific exit codes for internal errors: attach code to Error object

const PING_INTERVAL = 3000;
const MAX_PING_FAILS = 10;
/**
 * This class acts as a proxy for local topology inside parent process.
 */
export class TopologyLocalProxy {

    private init_cb: intf.SimpleCallback;
    private run_cb: intf.SimpleCallback;
    private pause_cb: intf.SimpleCallback;
    private shutdown_cb: intf.SimpleCallback;
    private has_exited: boolean;
    private exit_code: number;
    private child_exit_callback: intf.SimpleCallback;
    private child: cp.ChildProcess;
    private pingIntervalId: NodeJS.Timer;
    private pingInterval: number;
    private maxPingFails: number;
    private sentPings: number;
    private log_prefix: string;
    private last_child_err: Error;
    private cp: any; // injectable child_process library (useful for mocking)

    /** Constructor that sets up call routing */
    constructor(child_exit_callback: intf.SimpleCallback, child_process?: any) {
        this.log_prefix = "[Proxy] ";
        this.init_cb = null;
        this.run_cb = null;
        this.pause_cb = null;
        this.shutdown_cb = null;
        this.has_exited = false;
        this.exit_code = null;
        this.sentPings = 0;
        this.child_exit_callback = child_exit_callback || (() => { });
        this.child_exit_callback = tryCallback(this.child_exit_callback);
        this.child = null;
        this.cp = child_process || cp;
        this.pingInterval = PING_INTERVAL;
        this.maxPingFails = MAX_PING_FAILS;
    }

    /** Starts child process and sets up all event handlers */
    private setUpChildProcess(uuid: string) {
        let self = this;
        // send uuid in command-line parameters so that it is visible in process list
        // wont be used for anything
        this.child = this.cp.fork(path.join(__dirname, "topology_local_wrapper_main"), ["uuid:" + uuid], { silent: false });
        self.child.on("message", (msgx) => {
            let msg = msgx as intf.ChildMsg;
            if (msg.data.err) {
                msg.data.err = deserialize_error(msg.data.err);
            }
            if (msg.cmd == intf.ChildMsgCode.response_init) {
                if (msg.data.err) { self.last_child_err = msg.data.err; }
                if (self.init_cb) {
                    let cb = self.init_cb;
                    self.init_cb = null;
                    cb(msg.data.err);
                }
            }
            if (msg.cmd == intf.ChildMsgCode.error) {
                self.last_child_err = msg.data.err;
            }
            if (msg.cmd == intf.ChildMsgCode.response_run) {
                if (msg.data.err) { self.last_child_err = msg.data.err; }
                if (self.run_cb) {
                    let cb = self.run_cb;
                    self.run_cb = null;
                    cb(msg.data.err);
                }
            }
            if (msg.cmd == intf.ChildMsgCode.response_pause) {
                if (msg.data.err) { self.last_child_err = msg.data.err; }
                if (self.pause_cb) {
                    let cb = self.pause_cb;
                    self.pause_cb = null;
                    cb(msg.data.err);
                }
            }
            if (msg.cmd == intf.ChildMsgCode.response_ping) {
                self.sentPings = 0;
            }
            if (msg.cmd == intf.ChildMsgCode.response_shutdown) {
                if (msg.data.err) { self.last_child_err = msg.data.err; }
                if (self.shutdown_cb) {
                    let cb = self.shutdown_cb;
                    self.shutdown_cb = null;
                    cb(msg.data.err);
                }
            }
        });
        self.child.on("error", (e) => {
            // Called when the process could not be spawned or killed or when message sending fails
            // All of these are considered as bad state and we need to exit
            if (self.onExit) { self.onExit(e); }
            self.kill(() => { });
            self.has_exited = true;
        });
        // Normally close and exit will both be called shortly one after
        // the other.
        self.child.once("close", (code, signal) => {
            let exitErr = (signal == null && code !== 0) ?
                new Error(`Child process ${self.child.pid} exited with code ${code}`) : null;
            let e = self.last_child_err || exitErr;
            self.exit_code = code;
            if (self.onExit) { self.onExit(e); }
            self.has_exited = true;
        });
        self.child.once("exit", (code, signal) => {
            let exitErr = (signal == null && code !== 0) ?
                new Error(`Child process ${self.child.pid} exited with code ${code}`) : null;
            let e = self.last_child_err || exitErr;
            self.exit_code = code;
            if (self.onExit) { self.onExit(e); }
            self.has_exited = true;
        });
        
        self.setPingInterval();
    }
    
    private setPingInterval() {
        let self = this;
        if (self.pingIntervalId) {
            clearInterval(self.pingIntervalId);
        }
        // send ping to child in regular intervals
        self.pingIntervalId = setInterval(
            () => {
                if (self.sentPings < self.maxPingFails) {
                    self.sentPings++;
                    self.send(intf.ParentMsgCode.ping, {});
                } else {
                    log.logger().error(self.log_prefix + "Too many un-answered pings, sending kill to child process...");
                    self.last_child_err = new Error(self.log_prefix + "Maximal number of un-anwsered pings to child reached");
                    self.kill(() => { });
                }
            },
            self.pingInterval);
    }

    /** Check if this object has exited */
    hasExited(): boolean {
        return this.has_exited;
    }

    /** Check if this object has exited */
    exitCode(): number {
        return this.exit_code;
    }

    /** Returns process PID */
    getPid(): number {
        if (!this.child) { return null; }
        return this.child.pid;
    }

    /** Calls all pending callbacks with an exception
     * (process exited before receving callback) and
     * forwards the given error to child_exit_callback.
     * Also clears ping interval.
     */
    private onExit(e: Error) {
        this.onExit = null;
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
        if (this.init_cb) {
            this.init_cb(new Error(this.log_prefix + "Process exited before response_init from child was received."));
            this.init_cb = null;
        }
        if (this.run_cb) {
            this.run_cb(new Error(this.log_prefix + "Process exited before response_run from child was received."));
            this.run_cb = null;
        }
        if (this.pause_cb) {
            this.pause_cb(new Error(this.log_prefix + "Process exited before response_pause from child was received."));
            this.pause_cb = null;
        }
        if (this.shutdown_cb) {
            this.shutdown_cb(new Error(this.log_prefix + "Process exited before response_shutdown from child was received."));
            this.shutdown_cb = null;
        }
        this.child_exit_callback(e);
    }

    /** Sends initialization signal to underlaying process */
    init(uuid: string, config: any, callback: intf.SimpleCallback) {
        callback = tryCallback(callback);
        if (this.init_cb) {
            return callback(new Error(this.log_prefix + "Pending init callback already exists."));
        }
        if (this.child != null) {
            return callback(new Error(this.log_prefix + "Child already initialized."));
        }
        this.setUpChildProcess(uuid);

        this.log_prefix = `[Proxy ${uuid}] `;
        this.init_cb = callback;
        config.general.uuid = uuid;
        // child guards itself against initializing twice,
        // returns an exception in response
        this.send(intf.ParentMsgCode.init, config);
    }

    /** Sends run signal to underlaying process */
    run(callback: intf.SimpleCallback) {
        callback = tryCallback(callback);
        if (this.run_cb) {
            return callback(new Error(this.log_prefix + "Pending run callback already exists."));
        }
        this.run_cb = callback;
        // child guards itself against running twice
        // or running uninitialized, returns an exception in response
        this.send(intf.ParentMsgCode.run, {});
    }

    /** Sends pause signal to underlaying process */
    pause(callback: intf.SimpleCallback) {
        callback = tryCallback(callback);
        if (this.pause_cb) {
            return callback(new Error(this.log_prefix + "Pending pause callback already exists."));
        }
        this.pause_cb = callback;
        // child guards itself against pausing twice
        // or pausing uninitialized, returns an exception in response
        this.send(intf.ParentMsgCode.pause, {});
    }

    /** Sends shutdown signal to underlaying process */
    shutdown(callback: intf.SimpleCallback) {
        callback = tryCallback(callback);
        if (this.shutdown_cb) { // this proxy is in the process of shutdown
            return callback(new Error(this.log_prefix + "Shutdown already in process"));
        }
        this.shutdown_cb = callback;
        // child guards itself against shutting down twice
        // or shutting down uninitialized, returns an exception in response
        this.send(intf.ParentMsgCode.shutdown, {});
    }

    /** Sends SIGKILL signal to underlaying process.
     * This is a last resort - the child should normally
     * exit after receiving shutdown signal.
     */
    kill(callback: intf.SimpleCallback) {
        callback = tryCallback(callback);
        if ((this.child == null) || // not initialized
            this.child.killed || // already sent SIGKILL
            this.has_exited) { // exited by signal or exit (shutdown or error)
            return callback();
        }
        log.logger().important(this.log_prefix + "Sending SIGKILL to child process");
        this.child.kill("SIGKILL");
        setTimeout(callback, 50);
    }

    /** Internal method for sending messages to child process */
    private send(code: intf.ParentMsgCode, data: any) {
        let msg = { cmd: code, data: data } as intf.ParentMsg;
        if (this.child.connected) {
            this.child.send(msg);
        } else {
            log.logger().warn(this.log_prefix + 'Skipping send (child process not connected): ' + intf.ParentMsgCode[code]);
        }
    }
}
