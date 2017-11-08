"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const cp = require("child_process");
const intf = require("../topology_interfaces");
const log = require("../util/logger");
const deserialize_error = require("deserialize-error");
// TODO: specific exit codes for internal errors: attach code to Error object
const PING_INTERVAL = 3000;
const MAX_PING_FAILS = 10;
/**
 * This class acts as a proxy for local topology inside parent process.
 */
class TopologyLocalProxy {
    /** Constructor that sets up call routing */
    constructor(child_exit_callback) {
        this.log_prefix = "[Proxy] ";
        this.init_cb = null;
        this.run_cb = null;
        this.pause_cb = null;
        this.shutdown_cb = null;
        this.has_exited = false;
        this.sentPings = 0;
        this.child_exit_callback = child_exit_callback || (() => { });
        this.child = null;
    }
    /** Starts child process and sets up all event handlers */
    setUpChildProcess(uuid) {
        let self = this;
        // send uuid in command-line parameters so that it is visible in process list
        // wont be used for anything
        this.child = cp.fork(path.join(__dirname, "topology_local_wrapper_main"), ["uuid:" + uuid], { silent: false });
        self.child.on("message", (msgx) => {
            let msg = msgx;
            if (msg.data.err) {
                msg.data.err = deserialize_error(msg.data.err);
            }
            if (msg.cmd == intf.ChildMsgCode.response_init) {
                if (msg.data.err) {
                    self.last_child_err = msg.data.err;
                }
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
                if (msg.data.err) {
                    self.last_child_err = msg.data.err;
                }
                if (self.run_cb) {
                    let cb = self.run_cb;
                    self.run_cb = null;
                    cb(msg.data.err);
                }
            }
            if (msg.cmd == intf.ChildMsgCode.response_pause) {
                if (msg.data.err) {
                    self.last_child_err = msg.data.err;
                }
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
                if (msg.data.err) {
                    self.last_child_err = msg.data.err;
                }
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
            if (self.onExit) {
                self.onExit(e);
            }
            self.kill(() => { });
            self.has_exited = true;
        });
        self.child.once("close", (code, signal) => {
            let exitErr = (signal == null && code !== 0) ?
                new Error(`Child process ${this.child.pid} exited with code ${code}`) : null;
            let e = self.last_child_err || exitErr;
            if (self.onExit) {
                self.onExit(e);
            }
            self.has_exited = true;
        });
        self.child.once("exit", (code, signal) => {
            let exitErr = (signal == null && code !== 0) ?
                new Error(`Child process ${this.child.pid} exited with code ${code}`) : null;
            let e = self.last_child_err || exitErr;
            if (self.onExit) {
                self.onExit(e);
            }
            self.has_exited = true;
        });
        // send ping to child in regular intervals
        this.pingIntervalId = setInterval(() => {
            if (self.sentPings < MAX_PING_FAILS) {
                self.sentPings++;
                self.send(intf.ParentMsgCode.ping, {});
            }
            else {
                log.logger().error(this.log_prefix + "Too many un-answered pings, sending kill to child process...");
                self.last_child_err = new Error(this.log_prefix + "Maximal number of un-anwsered pings to child reached");
                self.kill(() => { });
            }
        }, PING_INTERVAL);
    }
    /** Check if this object has exited */
    hasExited() {
        return this.has_exited;
    }
    /** Returns process PID */
    getPid() {
        if (!this.child) {
            return null;
        }
        return this.child.pid;
    }
    /** Calls all pending callbacks with an exception
     * (process exited before receving callback) and
     * forwards the given error to child_exit_callback.
     * Also clears ping interval.
     */
    onExit(e) {
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
        this.onExit = null;
    }
    /** Sends initialization signal to underlaying process */
    init(uuid, config, callback) {
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
    run(callback) {
        if (this.run_cb) {
            return callback(new Error(this.log_prefix + "Pending run callback already exists."));
        }
        this.run_cb = callback;
        // child guards itself against running twice
        // or running uninitialized, returns an exception in response
        this.send(intf.ParentMsgCode.run, {});
    }
    /** Sends pause signal to underlaying process */
    pause(callback) {
        if (this.pause_cb) {
            return callback(new Error(this.log_prefix + "Pending pause callback already exists."));
        }
        this.pause_cb = callback;
        // child guards itself against pausing twice
        // or pausing uninitialized, returns an exception in response
        this.send(intf.ParentMsgCode.pause, {});
    }
    /** Sends shutdown signal to underlaying process */
    shutdown(callback) {
        if (this.shutdown_cb) {
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
    kill(callback) {
        if ((this.child == null) ||
            this.child.killed ||
            this.has_exited) {
            return callback();
        }
        this.child.kill("SIGKILL");
        return callback();
    }
    /** Internal method for sending messages to child process */
    send(code, data) {
        let msg = { cmd: code, data: data };
        this.child.send(msg);
    }
}
exports.TopologyLocalProxy = TopologyLocalProxy;
//# sourceMappingURL=topology_local_proxy.js.map