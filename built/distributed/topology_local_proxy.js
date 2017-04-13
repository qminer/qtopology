"use strict";
const path = require("path");
const cp = require("child_process");
/**
 * This class acts as a proxy for local topology inside parent process.
 */
class TopologyLocalProxy {
    /** Constructor that sets up call routing */
    constructor(options) {
        let self = this;
        this._init_cb = null;
        this._run_cb = null;
        this._pause_cb = null;
        this._shutdown_cb = null;
        this._child_exit_callback = options.child_exit_callback || (() => { });
        this._child = cp.fork(path.join(__dirname, "topology_local_wrapper"), []);
        self._child.on("message", (msg) => {
            if (msg.cmd == "response_init") {
                if (self._init_cb) {
                    self._init_cb(msg.data.err);
                    self._init_cb = null;
                }
            }
            if (msg.cmd == "response_run") {
                if (self._run_cb) {
                    self._run_cb(msg.data.err);
                    self._run_cb = null;
                }
            }
            if (msg.cmd == "response_pause") {
                if (self._pause_cb) {
                    self._pause_cb(msg.data.err);
                    self._pause_cb = null;
                }
            }
            if (msg.cmd == "response_shutdown") {
                if (self._shutdown_cb) {
                    self._shutdown_cb(msg.data.err);
                    self._shutdown_cb = null;
                }
            }
        });
        self._child.on("error", (e) => {
            self._callPendingCallbacks(e);
            self._child_exit_callback(e);
        });
        self._child.on("close", (code) => {
            let e = new Error("CLOSE Child process exited with code " + code);
            self._callPendingCallbacks(e);
            if (code === 0) {
                e = null;
            }
            self._child_exit_callback(e);
        });
        self._child.on("exit", (code) => {
            let e = new Error("EXIT Child process exited with code " + code);
            self._callPendingCallbacks(e);
            if (code === 0) {
                e = null;
            }
            self._child_exit_callback(e);
        });
    }
    /** Calls all pending callbacks with given error and clears them. */
    _callPendingCallbacks(e) {
        if (this._init_cb) {
            this._init_cb(e);
            this._init_cb = null;
        }
        if (this._run_cb) {
            this._run_cb(e);
            this._run_cb = null;
        }
        if (this._pause_cb) {
            this._pause_cb(e);
            this._pause_cb = null;
        }
        if (this._shutdown_cb) {
            this._shutdown_cb(e);
            this._shutdown_cb = null;
        }
    }
    /** Sends initialization signal to underlaying process */
    init(config, callback) {
        if (this._init_cb) {
            return callback(new Error("Pending init callback already exists."));
        }
        this._init_cb = callback;
        this._child.send({ cmd: "init", data: config });
    }
    /** Sends run signal to underlaying process */
    run(callback) {
        if (this._run_cb) {
            return callback(new Error("Pending run callback already exists."));
        }
        this._run_cb = callback;
        this._child.send({ cmd: "run", data: {} });
    }
    /** Sends pause signal to underlaying process */
    pause(callback) {
        if (this._pause_cb) {
            return callback(new Error("Pending pause callback already exists."));
        }
        this._pause_cb = callback;
        this._child.send({ cmd: "pause", data: {} });
    }
    /** Sends shutdown signal to underlaying process */
    shutdown(callback) {
        if (this._shutdown_cb) {
            return callback(new Error("Pending shutdown callback already exists."));
        }
        this._shutdown_cb = callback;
        this._child.send({ cmd: "shutdown", data: {} });
    }
}
/////////////////////////////////////////////////////////////////////////////////////
exports.TopologyLocalProxy = TopologyLocalProxy;
