import * as path from "path";
import * as cp from "child_process";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as deserialize_error from "deserialize-error";

// INIT
// [local wrapper] topology_local exists -> (response_init, error), NOT exit
// [local] call 2x -> (response_init, error), exit(init_error)
// [local] setup context error -> (response_init, error), exit(init_error)
// [local] bolt/spout construction errors -> (response_init, error), exit(init_error)
// [local inproc] bolt/spout init error -> (response_init, error), exit(init_error)

// SHUTDOWN (must result in exit)
// [local wrapper] no topology_local -> (response_shutdown, error), exit(shutdown_notinit_error)
// [local wrapper] call 2x -> (), NOT exit
// [local wrapper] unlikely error -> (response_shutdown, error), exit(shutdown_unlikely_error)
// ([local] call 2x -> (response_shutdown, error), exit(shutdown_internal_error))  // this behavior would happen if upper layers would permit this event
// [local] not initialized -> (response_shutdown, error), exit(shutdown_internal_error)
// [local inproc] bolt/spout shutdown error -> (response_shutdown, error), exit(shutdown_internal_error)
// ([local inproc] call 2x -> (response_shutdown, error), exit(shutdown_internal_error)) // this behavior would happen if upper layers would permit this event
// ([local inproc] call 1x fail then call again -> (response_shutdown, error), exit(shutdown_internal_error)) // this behavior would happen if upper layers would permit this event

// PING
// [local wrapper] connection to parent lost -> (error), exit(parent_disconnect)
// [local wrapper] ping timeout -> (error), exit(parent_ping_timeout)

// PAUSE
// [local wrapper] no topology_local -> (response_pause, error), NOT exit
// [local] not initialized -> (response_pause, error), exit(pause_error)
// [local] bolt/spout pause error -> (error), exit(internal_error)
// [local inproc] call 2x -> (response_pause), NOT exit

// RUN
// [local wrapper] no topology_local -> (response_run, error), NOT exit
// [local] not initialized -> (response_run, error), exit(run_error)
// [local] call 2x -> (response_run, error), exit(run_error)
// [local inproc] spout run error -> (error), exit(internal_error)
// ([local inproc] call 2x -> (response_run), NOT exit) // this behavior would happen if upper layers would permit this event

// HEARTBEAT
// [local inproc] bolt/spout hearbeat error -> (error), exit(internal_error)

// TODO: consistent behavior on all levels: call 2x, not initialized
// TODO: specific exit codes for internal errors: attach code to Error object
// TODO: local inproc: guards against noninit


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
    private was_shut_down: boolean;
    private has_exited: boolean;
    private child_exit_callback: intf.SimpleCallback;
    private child: cp.ChildProcess;
    private pingIntervalId: NodeJS.Timer;
    private sentPings: number;
    private log_prefix: string;
    private last_child_err: Error;

    /** Constructor that sets up call routing */
    constructor(child_exit_callback: intf.SimpleCallback) {
        this.log_prefix = "[Proxy] ";
        this.init_cb = null;
        this.run_cb = null;
        this.pause_cb = null;
        this.shutdown_cb = null;
        this.was_shut_down = false;
        this.has_exited = false;
        this.sentPings = 0;
        this.child_exit_callback = child_exit_callback || (() => { });
        this.child = null;
    }

    /** Starts child process and sets up all event handlers */
    private setUpChildProcess(uuid: string) {
        let self = this;
        // send uuid in command-line parameters so that it is visible in process list
        // wont be used for anything
        this.child = cp.fork(path.join(__dirname, "topology_local_wrapper"), ["uuid:" + uuid], { silent: false });
        self.child.on("message", (msgx) => {
            let msg = msgx as intf.ChildMsg;
            if (msg.data.err) {
                msg.data.err = deserialize_error(msg.data.err);
            }
            if (msg.cmd == intf.ChildMsgCode.response_init) {
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
                if (self.run_cb) {
                    let cb = self.run_cb;
                    self.run_cb = null;
                    cb(msg.data.err);
                }
            }
            if (msg.cmd == intf.ChildMsgCode.response_pause) {
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
                self.was_shut_down = true;
                if (self.shutdown_cb) {
                    let cb = self.shutdown_cb;
                    self.shutdown_cb = null;
                    cb(msg.data.err);
                }
            }
        });
        self.child.on("error", (e) => {
            // TODO error/close/exit should call this only once
            // Called when the process could not be spawned or killed or when message sending fails
            // TODO handle different fail cases
            self.callPendingCallbacks(e);
            self.child_exit_callback(e);
            self.callPendingCallbacks2(e);
        });
        self.child.on("close", (code, signal) => {
            // TODO error/close/exit should call this only once
            let msg = code != null ? `Child process ${this.child.pid} exited with code ${code}` :
                `Child process ${this.child.pid} was terminated with signal ${signal}`;
            let e = self.last_child_err || new Error("CLOSE " + msg);
            self.callPendingCallbacks(e);
            if (code === 0) {
                e = null;
            }
            self.child_exit_callback(e);
            self.callPendingCallbacks2(e);
        });
        self.child.on("exit", (code, signal) => {
            // TODO error/close/exit should call this only once
            let msg = code != null ? `Child process ${this.child.pid} exited with code ${code}` :
                `Child process ${this.child.pid} was terminated with signal ${signal}`;
            let e = self.last_child_err || new Error("EXIT " + msg);
            self.callPendingCallbacks(e);
            if (code === 0) {
                e = null;
            }
            self.child_exit_callback(e);
            self.callPendingCallbacks2(e);
            self.has_exited = true;
        });
        // send ping to child every 3 seconds
        this.pingIntervalId = setInterval(
            () => {
                if (self.sentPings < MAX_PING_FAILS) {
                    self.sentPings++;
                    self.send(intf.ParentMsgCode.ping, {});
                } else {
                    log.logger().error(this.log_prefix + "Too many un-answered pings, sending kill to child process...");
                    // TODO mark that this has happened
                    // handle in exit event?
                    self.kill(() => { });
                }
            },
            PING_INTERVAL);
    }

    /** Check if this object has been shut down already */
    wasShutDown(): boolean {
        return this.was_shut_down;
    }

    /** Check if this object has exited */
    hasExited(): boolean {
        return this.has_exited;
    }

    /** Returns process PID */
    getPid(): number {
        if (!this.child) { return null; }
        return this.child.pid;
    }

    /** Calls all pending callbacks with given error and clears them. */
    private callPendingCallbacks(e: Error) {

        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }

        if (this.init_cb) {
            this.init_cb(e);
            this.init_cb = null;
        }
        if (this.run_cb) {
            this.run_cb(e);
            this.run_cb = null;
        }
        if (this.pause_cb) {
            this.pause_cb(e);
            this.pause_cb = null;
        }
    }

    /** Calls pending shutdown callback with given error and clears it. */
    private callPendingCallbacks2(e: Error) {
        if (this.shutdown_cb) {
            let cb = this.shutdown_cb;
            this.shutdown_cb = null;
            cb(null);
        }
    }

    /** Sends initialization signal to underlaying process */
    init(uuid: string, config: any, callback: intf.SimpleCallback) {
        if (this.init_cb) {
            return callback(new Error("Pending init callback already exists."));
        }
        // TODO guard against existing child
        this.setUpChildProcess(uuid);

        this.log_prefix = `[Proxy ${uuid}] `;
        this.init_cb = callback;
        config.general.uuid = uuid;
        this.send(intf.ParentMsgCode.init, config);
    }

    /** Sends run signal to underlaying process */
    run(callback: intf.SimpleCallback) {
        if (this.run_cb) {
            return callback(new Error("Pending run callback already exists."));
        }
        this.run_cb = callback;
        // child guards itself against running twice
        // or running uninitialized (returns an exception in response)
        this.send(intf.ParentMsgCode.run, {});
    }

    /** Sends pause signal to underlaying process */
    pause(callback: intf.SimpleCallback) {
        if (this.pause_cb) {
            return callback(new Error("Pending pause callback already exists."));
        }
        this.pause_cb = callback;
        this.send(intf.ParentMsgCode.pause, {});
    }

    /** Sends shutdown signal to underlaying process */
    shutdown(callback: intf.SimpleCallback) {
        if (this.was_shut_down) { // this proxy was shut down already, completely
            return callback(new Error(this.log_prefix + "Already shutdown."));
        }
        if (this.shutdown_cb) { // this proxy is in the process of shutdown
            return callback(new Error(this.log_prefix + "Shutdown already in process"));
        }
        // ok, start shutdown
        this.shutdown_cb = callback;
        this.send(intf.ParentMsgCode.shutdown, {});
    }

    /** Sends kill signal to underlaying process */
    kill(callback: intf.SimpleCallback) {
        if ((this.child == null) || this.child.killed ||
            (this.was_shut_down && this.has_exited)) {
            return callback();
        }
        if (this.was_shut_down) {
            if (!this.has_exited) {
                // child shutdown must result in exit!
                log.logger().error(this.log_prefix +
                    "THIS SHOULD NOT HAPPEN. Child has shutdown but has not exited");
            }
        }
        this.child.kill("SIGKILL");
        return callback();
    }

    /** Internal method for sending messages to child process */
    private send(code: intf.ParentMsgCode, data: any) {
        let msg = { cmd: code, data: data } as intf.ParentMsg;
        this.child.send(msg);
    }
}
