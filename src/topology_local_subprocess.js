"use strict";

const async = require("async");
const cp = require("child_process");
const EventEmitter = require("events");

////////////////////////////////////////////////////////////////////

/** Base class for communication with underlaying process */
class TopologyNode extends EventEmitter {

    /** Constructor needs to receive basic data */
    constructor(config) {
        super();
        this._name = config.name;
        this._working_dir = config.working_dir;
        this._cmd = config.cmd;
        this._args = config.args || [];
        this._init = config.init || {};

        this._isStarted = false;
        this._isClosed = false;
        this._isExit = false;
        this._isError = false;
        this._onExit = null;

        this._pendingInitCallback = null;

        try {
            this._child = cp.fork(this._cmd, this._args, { cwd: this._working_dir });
            this._isStarted = true;
        } catch (e) {
            this._isStarted = true;
            this._isClosed = true;
            this._isExit = true;
            this._isError = true;
        }
    }

    /** Returns name of this node */
    getName() {
        return this._name;
    }

    /** Handler for heartbeat signal */
    heartbeat() {
        this._child.send({ cmd: "heartbeat" });
    }

    /** Shuts down the process */
    shutdown(callback) {
        this._child.send({ cmd: "shutdown" });
        this._onExit = callback;
    }

    /** Initializes system object that represents child process.
     * Attaches to all relevant alerts. Sends init data to child process.
    */
    init(callback) {
        let self = this;
        self._pendingInitCallback = callback;
        self._child.on("error", (e) => {
            self._isError = true;
            self.emit("error", e);
            if (self._pendingInitCallback) {
                self._pendingInitCallback(e);
                self._pendingInitCallback = null;
            }
        });
        self._child.on("close", (code) => {
            self._isClosed = true;
            self.emit("closed", code);
        });
        self._child.on("exit", (code) => {
            self._isExit = true;
            self.emit("exit", code);
            if (self._onExit) {
                self._onExit();
            }
            if (self._pendingInitCallback) {
                self._pendingInitCallback(code);
                self._pendingInitCallback = null;
            }
        });
        self._child.on("message", (msg) => {
            if (msg.cmd == "init_completed") {
                self._pendingInitCallback();
                self._pendingInitCallback = null;
                return;
            }
            self.emit(msg.cmd, msg);
        });
        self._child.send({ cmd: "init", data: self._init });
    }
}

/** Wrapper for "bolt" process */
class TopologyBolt extends TopologyNode {

    /** Constructor needs to receive all data */
    constructor(config) {
        super(config);
        this._emitCallback = config.onEmit || (() => { });
        let self = this;
        this.on("data", (msg) => {
            self._emitCallback(msg);
        });
    }

    /** Sends data tuple to child process */
    send(data) {
        this._child.send({ cmd: "data", data: data });
    }
}

/** Wrapper for "spout" process */
class TopologySpout extends TopologyNode {

    /** Constructor needs to receive all data */
    constructor(config) {
        super(config);
        let self = this;
        self._emitCallback = config.onEmit || (() => { console.log("Empty emit cb"); });
        self._isPaused = true;
        self._nextPending = false;
        self._empty = true;
        self._nextCallback = null;
        self._nextTs = Date.now();

        self.on("data", (msg) => {
            self._nextPending = false;
            self._emitCallback(msg.data);
            self._nextCallback();
        });
        self.on("empty", () => {
            self._nextPending = false;
            self._empty = true;
            self._nextTs = Date.now() + 1 * 1000; // sleep for 1sec if spout is empty
            self._nextCallback(null);
        });
    }

    /** Sends run signal and starts the "pump"" */
    run() {
        let self = this;
        this._isPaused = false;
        this._empty = true;
        this._child.send({ cmd: "run" });
        async.whilst(
            () => { return !self._isPaused; },
            (xcallback) => {
                if (Date.now() < this._nextTs) {
                    // if empty, sleep for a while
                    let sleep = this._nextTs - Date.now();
                    setTimeout(() => { xcallback(); }, sleep);
                } else {
                    self.next(xcallback);
                }
            },
            () => { });
    }

    /** Requests next data message */
    next(callback) {
        if (this._nextPending) {
            throw new Error("Cannot call next() when previous call is still pending.");
        }
        if (this._isPaused) {
            callback();
        } else {
            this._empty = false;
            this._nextPending = true;
            this._nextCallback = callback;
            this._child.send({ cmd: "next" });
        }
    }

    /** Sends pause signal */
    pause() {
        this._isPaused = true;
        this._child.send({ cmd: "pause" });
    }
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyBolt = TopologyBolt;
exports.TopologySpout = TopologySpout;
