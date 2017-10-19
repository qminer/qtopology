import * as path from "path";
import * as cp from "child_process";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

/**
 * This class acts as a proxy for local topology inside parent process.
 */
export class TopologyLocalProxy {

    private init_cb: intf.SimpleCallback;
    private run_cb: intf.SimpleCallback;
    private pause_cb: intf.SimpleCallback;
    private shutdown_cb: intf.SimpleCallback;
    private was_shut_down: boolean;
    private child_exit_callback: intf.SimpleCallback;
    private child: cp.ChildProcess;
    private pingIntervalId: NodeJS.Timer;
    private pendingPings: number;
    private log_prefix: string;

    /** Constructor that sets up call routing */
    constructor(child_exit_callback: intf.SimpleCallback) {
        let self = this;

        this.log_prefix = "[Proxy] ";
        this.init_cb = null;
        this.run_cb = null;
        this.pause_cb = null;
        this.shutdown_cb = null;
        this.was_shut_down = false;
        this.pendingPings = 0;
        this.child_exit_callback = child_exit_callback || (() => { });
        this.child = cp.fork(path.join(__dirname, "topology_local_wrapper"), [], { silent: false });

        self.child.on("message", (msgx) => {
            let msg = msgx as intf.ChildMsg;
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
        this.pingIntervalId = setInterval(
            () => {
                if (self.pendingPings < 10) {
                    self.pendingPings++;
                    self.send(intf.ParentMsgCode.ping, {});
                } else {
                    log.logger().error(this.log_prefix + "Too many un-answered pings, sending kill to child process...");
                    self.kill(() => { });
                }
            },
            3000);
    }

    /** Check if this object has been shut down already */
    wasShutDown() {
        return this.was_shut_down;
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
            return callback();
        }
        if (this.shutdown_cb) { // this proxy is in the process of shutdown
            return callback();
        }
        // ok, start shutdown
        this.shutdown_cb = callback;
        this.send(intf.ParentMsgCode.shutdown, {});
    }

    /** Sends kill signal to underlaying process */
    kill(callback: intf.SimpleCallback) {
        if (this.was_shut_down) { // this proxy was shut down already, completely
            return callback();
        }
        process.kill(this.child.pid, "SIGKILL");
        callback();
    }

    /** Internal method for sending messages to child process */
    private send(code: intf.ParentMsgCode, data: any) {
        let msg = { cmd: code, data: data } as intf.ParentMsg;
        this.child.send(msg);
    }
}
