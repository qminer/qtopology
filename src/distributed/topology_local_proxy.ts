import * as path from "path";
import * as cp from "child_process";
import * as intf from "../topology_interfaces";

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

    /** Constructor that sets up call routing */
    constructor(child_exit_callback: intf.SimpleCallback) {
        let self = this;

        this.init_cb = null;
        this.run_cb = null;
        this.pause_cb = null;
        this.shutdown_cb = null;
        this.was_shut_down = false;
        this.child_exit_callback = child_exit_callback || (() => { });
        this.child = cp.fork(path.join(__dirname, "topology_local_wrapper"), [], { silent: false });

        self.child.on("message", (msgx) => {
            let msg = msgx as intf.ChildMsg;
            if (msg.cmd == intf.ChildMsgCode.response_init) {
                if (self.init_cb) {
                    self.init_cb(msg.data.err);
                    self.init_cb = null;
                }
            }
            if (msg.cmd == intf.ChildMsgCode.response_run) {
                if (self.run_cb) {
                    self.run_cb(msg.data.err);
                    self.run_cb = null;
                }
            }
            if (msg.cmd == intf.ChildMsgCode.response_pause) {
                if (self.pause_cb) {
                    self.pause_cb(msg.data.err);
                    self.pause_cb = null;
                }
            }
            if (msg.cmd == intf.ChildMsgCode.response_shutdown) {
                self.was_shut_down = true;
                self.callPendingCallbacks2(null);
            }
        });

        self.child.on("error", (e) => {
            self.callPendingCallbacks(e);
            self.child_exit_callback(e);
            self.callPendingCallbacks2(e);
        });
        self.child.on("close", (code) => {
            let e = new Error("CLOSE Child process exited with code " + code);
            self.callPendingCallbacks(e);
            if (code === 0) {
                e = null;
            }
            self.child_exit_callback(e);
            self.callPendingCallbacks2(e);
        });
        self.child.on("exit", (code) => {
            let e = new Error("EXIT Child process exited with code " + code);
            self.callPendingCallbacks(e);
            if (code === 0) {
                e = null;
            }
            self.child_exit_callback(e);
            self.callPendingCallbacks2(e);
        });
    }

    /** Check if this object has been shut down already */
    wasShutDown() {
        return this.was_shut_down;
    }

    /** Calls all pending callbacks with given error and clears them. */
    private callPendingCallbacks(e: Error) {
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
            this.shutdown_cb(null);
            this.shutdown_cb = null;
        }
    }

    /** Sends initialization signal to underlaying process */
    init(uuid: string, config: any, callback: intf.SimpleCallback) {
        if (this.init_cb) {
            return callback(new Error("Pending init callback already exists."));
        }
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
        if (this.shutdown_cb) {
            return callback();
        }
        this.shutdown_cb = callback;
        this.send(intf.ParentMsgCode.shutdown, {});
    }

    /** Internal method for sending messages to child process */
    private send(code: intf.ParentMsgCode, data: any) {
        let msg = { cmd: code, data: data } as intf.ParentMsg;
        this.child.send(msg);
    }
}
