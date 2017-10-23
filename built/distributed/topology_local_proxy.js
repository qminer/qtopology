"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const cp = require("child_process");
const intf = require("../topology_interfaces");
const log = require("../util/logger");
/**
 * This class acts as a proxy for local topology inside parent process.
 */
class TopologyLocalProxy {
    /** Constructor that sets up call routing */
    constructor(child_exit_callback) {
        let self = this;
        this.log_prefix = "[Proxy] ";
        this.init_cb = null;
        this.run_cb = null;
        this.pause_cb = null;
        this.shutdown_cb = null;
        this.was_shut_down = false;
        this.pendingPings = 0;
        this.child_exit_callback = child_exit_callback || (() => { });
        this.child = null;
    }
    /** Starts child process and sets up all event handlers */
    setUpChildProcess(uuid) {
        let self = this;
        // send uuid in command-line parameters so that it is visible in process list
        // wont be used for anything
        this.child = cp.fork(path.join(__dirname, "topology_local_wrapper"), ["uuid:" + uuid], { silent: false });
        self.child.on("message", (msgx) => {
            let msg = msgx;
            if (msg.cmd == intf.ChildMsgCode.response_init) {
                if (self.init_cb) {
                    let cb = self.init_cb;
                    self.init_cb = null;
                    cb(msg.data.err);
                }
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
                self.pendingPings--;
            }
            if (msg.cmd == intf.ChildMsgCode.response_shutdown) {
                self.was_shut_down = true;
                self.callPendingCallbacks2(msg.data.err);
            }
        });
        self.child.on("error", (e) => {
            self.callPendingCallbacks(e);
            self.child_exit_callback(e);
            self.callPendingCallbacks2(e);
        });
        self.child.on("close", (code) => {
            let e = new Error(`CLOSE Child process ${this.child.pid} exited with code ${code}`);
            self.callPendingCallbacks(e);
            if (code === 0) {
                e = null;
            }
            self.child_exit_callback(e);
            self.callPendingCallbacks2(e);
        });
        self.child.on("exit", (code) => {
            let e = new Error(`EXIT Child process ${this.child.pid} exited with code ${code}`);
            self.callPendingCallbacks(e);
            if (code === 0) {
                e = null;
            }
            self.child_exit_callback(e);
            self.callPendingCallbacks2(e);
        });
        // send ping to child every 3 seconds
        this.pingIntervalId = setInterval(() => {
            if (self.pendingPings < 10) {
                self.pendingPings++;
                self.send(intf.ParentMsgCode.ping, {});
            }
            else {
                log.logger().error(this.log_prefix + "Too many un-answered pings, sending kill to child process...");
                self.kill(() => { });
            }
        }, 3000);
    }
    /** Check if this object has been shut down already */
    wasShutDown() {
        return this.was_shut_down;
    }
    /** Returns process PID */
    getPid() {
        if (!this.child)
            return null;
        return this.child.pid;
    }
    /** Calls all pending callbacks with given error and clears them. */
    callPendingCallbacks(e) {
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
    callPendingCallbacks2(e) {
        if (this.shutdown_cb) {
            let cb = this.shutdown_cb;
            this.shutdown_cb = null;
            cb(null);
        }
    }
    /** Sends initialization signal to underlaying process */
    init(uuid, config, callback) {
        if (this.init_cb) {
            return callback(new Error("Pending init callback already exists."));
        }
        this.setUpChildProcess(uuid);
        this.log_prefix = `[Proxy ${uuid}] `;
        this.init_cb = callback;
        config.general.uuid = uuid;
        this.send(intf.ParentMsgCode.init, config);
    }
    /** Sends run signal to underlaying process */
    run(callback) {
        if (this.run_cb) {
            return callback(new Error("Pending run callback already exists."));
        }
        this.run_cb = callback;
        this.send(intf.ParentMsgCode.run, {});
    }
    /** Sends pause signal to underlaying process */
    pause(callback) {
        if (this.pause_cb) {
            return callback(new Error("Pending pause callback already exists."));
        }
        this.pause_cb = callback;
        this.send(intf.ParentMsgCode.pause, {});
    }
    /** Sends shutdown signal to underlaying process */
    shutdown(callback) {
        if (this.was_shut_down) {
            return callback();
        }
        if (this.shutdown_cb) {
            return callback();
        }
        // ok, start shutdown
        this.shutdown_cb = callback;
        this.send(intf.ParentMsgCode.shutdown, {});
    }
    /** Sends kill signal to underlaying process */
    kill(callback) {
        if (this.was_shut_down) {
            return callback();
        }
        process.kill(this.child.pid, "SIGKILL");
        callback();
    }
    /** Internal method for sending messages to child process */
    send(code, data) {
        let msg = { cmd: code, data: data };
        this.child.send(msg);
    }
}
exports.TopologyLocalProxy = TopologyLocalProxy;
//# sourceMappingURL=topology_local_proxy.js.map