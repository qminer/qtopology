import * as path from "path";
import * as cp from "child_process";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as deserialize_error from "deserialize-error";
import { tryCallback } from "../util/callback_wrappers";

// TODO: specific exit codes for internal errors: attach code to Error object

/**
 * This class acts as a proxy for local topology inside parent process.
 */
export class TopologyLocalProxy {

    private init_cb: intf.SimpleCallback;
    private run_cb: intf.SimpleCallback;
    private pause_cb: intf.SimpleCallback;
    private shutdown_cb: intf.SimpleCallback;
    private received_shutdown_response: boolean;
    private has_exited: boolean;
    private exit_code: number;
    private child_exit_callback: intf.SimpleCallback;
    private child: cp.ChildProcess;
    private pingIntervalId: NodeJS.Timer;
    private pingTimeout: number; // milliseconds
    private pingInterval: number; // milliseconds
    private lastPing: number;
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
        this.received_shutdown_response = false;
        this.has_exited = false;
        this.exit_code = null;
        this.child_exit_callback = child_exit_callback || (() => {
            // no-op
        });
        this.child_exit_callback = tryCallback(this.child_exit_callback);
        this.child = null;
        this.cp = child_process || cp;
        this.pingTimeout = 30 * 1000;
        this.pingInterval = 3000;
        this.lastPing = Date.now();
    }

    /** Check if this object has exited */
    public hasExited(): boolean {
        return this.has_exited;
    }

    /** Check if this object has exited */
    public exitCode(): number {
        return this.exit_code;
    }

    /** Returns process PID */
    public getPid(): number {
        if (!this.child) { return null; }
        return this.child.pid;
    }

    /** Sends initialization signal to underlaying process */
    public init(uuid: string, config: any, callback: intf.SimpleCallback) {
        callback = tryCallback(callback);
        if (this.init_cb) {
            return callback(new Error(this.log_prefix + "Pending init callback already exists."));
        }
        if (this.child != null) {
            return callback(new Error(this.log_prefix + "Child already initialized."));
        }
        if (config.general && config.general.wrapper) {
            this.pingTimeout = config.general.wrapper.ping_parent_timeout || this.pingTimeout;
            this.pingInterval = config.general.wrapper.ping_parent_interval || this.pingInterval;
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
    public run(callback: intf.SimpleCallback) {
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
    public pause(callback: intf.SimpleCallback) {
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
    public shutdown(callback: intf.SimpleCallback) {
        callback = tryCallback(callback);
        if (this.shutdown_cb) { // this proxy is in the process of shutdown
            return callback(new Error(this.log_prefix + "Shutdown already in process"));
        }

        // the child might have ALREADY sent shutdown response (SIGINT, SIGTERM)
        if (this.received_shutdown_response) {
            // the child also exited and onExit was called before
            if (this.has_exited) {
                this.shutdown_cb = () => {
                    // just to guard against second call from parent
                };
                return callback();
            } else {
                // the child WILL exit soon (it calls killProcess right after sending response to parent)
                // this.shutdown_cb must NOT be set (otherwise onExit will create an error)
                return callback();
            }
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
    public kill(callback: intf.SimpleCallback) {
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
        const msg = { cmd: code, data } as intf.IParentMsg;
        if (this.child.connected) {
            this.child.send(msg);
        } else {
            log.logger().warn(this.log_prefix +
                "Skipping send (child process not connected): " + intf.ParentMsgCode[code]);
        }
    }

    /** Starts child process and sets up all event handlers */
    private setUpChildProcess(uuid: string) {
        // send uuid in command-line parameters so that it is visible in process list
        // wont be used for anything
        this.child = this.cp.fork(
            path.join(__dirname, "topology_local_wrapper_main"),
            ["uuid:" + uuid],
            { silent: false });
        this.child.on("message", msgx => {
            const msg = msgx as intf.IChildMsg;
            if (msg.data.err) {
                msg.data.err = deserialize_error(msg.data.err);
            }
            if (msg.cmd == intf.ChildMsgCode.response_init) {
                if (msg.data.err) { this.last_child_err = msg.data.err; }
                if (this.init_cb) {
                    const cb = this.init_cb;
                    this.init_cb = null;
                    cb(msg.data.err);
                }
            }
            if (msg.cmd == intf.ChildMsgCode.error) {
                this.last_child_err = msg.data.err;
            }
            if (msg.cmd == intf.ChildMsgCode.response_run) {
                if (msg.data.err) { this.last_child_err = msg.data.err; }
                if (this.run_cb) {
                    const cb = this.run_cb;
                    this.run_cb = null;
                    cb(msg.data.err);
                }
            }
            if (msg.cmd == intf.ChildMsgCode.response_pause) {
                if (msg.data.err) { this.last_child_err = msg.data.err; }
                if (this.pause_cb) {
                    const cb = this.pause_cb;
                    this.pause_cb = null;
                    cb(msg.data.err);
                }
            }
            if (msg.cmd == intf.ChildMsgCode.response_ping) {
                this.lastPing = Date.now();
            }
            if (msg.cmd == intf.ChildMsgCode.response_shutdown) {
                // on SIGINT, the child might exit before the
                // parent requests it and shutdown callback
                // will not exist yet.
                this.received_shutdown_response = true;
                if (msg.data.err) { this.last_child_err = msg.data.err; }
                if (this.shutdown_cb) {
                    const cb = this.shutdown_cb;
                    this.shutdown_cb = null;
                    cb(msg.data.err);
                }
            }
        });
        this.child.on("error", e => {
            // Called when the process could not be spawned or killed or when message sending fails
            // All of these are considered as bad state and we need to exit
            this.has_exited = true;
            if (this.onExit) { this.onExit(e); }
            this.kill(() => {
                // no-op
            });
        });
        // Normally close and exit will both be called shortly one after
        // the other.
        this.child.once("close", (code, signal) => {
            const exitErr = (signal == null && code !== 0) ?
                new Error(`Child process ${this.child.pid} exited with code ${code}`) : null;
            const e = this.last_child_err || exitErr;
            this.exit_code = code;
            this.has_exited = true;
            if (this.onExit) { this.onExit(e); }
        });
        this.child.once("exit", (code, signal) => {
            const exitErr = (signal == null && code !== 0) ?
                new Error(`Child process ${this.child.pid} exited with code ${code}`) : null;
            const e = this.last_child_err || exitErr;
            this.exit_code = code;
            this.has_exited = true;
            if (this.onExit) { this.onExit(e); }
        });

        this.setPingInterval();
    }

    private setPingInterval() {
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
        }
        // send ping to child in regular intervals
        this.pingIntervalId = setInterval(
            () => {
                const now = Date.now();
                if (now - this.lastPing < this.pingTimeout) {
                    this.send(intf.ParentMsgCode.ping, {});
                } else {
                    log.logger().error(this.log_prefix +
                        "Too many un-answered pings, sending kill to child process...");
                    this.last_child_err = new Error(this.log_prefix +
                        "Maximal number of un-anwsered pings to child reached");
                    this.kill(() => {
                        // no-op
                    });
                }
            },
            this.pingInterval);
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
            this.init_cb(new Error(this.log_prefix +
                "Process exited before response_init from child was received."));
            this.init_cb = null;
        }
        if (this.run_cb) {
            this.run_cb(new Error(this.log_prefix +
                "Process exited before response_run from child was received."));
            this.run_cb = null;
        }
        if (this.pause_cb) {
            this.pause_cb(new Error(this.log_prefix +
                "Process exited before response_pause from child was received."));
            this.pause_cb = null;
        }
        if (this.shutdown_cb) {
            this.shutdown_cb(new Error(this.log_prefix +
                "Process exited before response_shutdown from child was received."));
            this.shutdown_cb = null;
        }
        this.child_exit_callback(e);
    }
}
