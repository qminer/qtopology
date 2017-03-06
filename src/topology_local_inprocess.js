"use strict";

const async = require("async");
const path = require("path");
const cp = require("child_process");
const EventEmitter = require("events");

////////////////////////////////////////////////////////////////////

/** Base class for communication with in-process object */
class TopologyNodeInproc extends EventEmitter {

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

        let self = this;

        try {
            let module_path = path.join(this.working_dir, this._cmd);
            this._child = require(module_path).create({
                onEmit: (data) => {
                    self.emit("data", data);
                }
            });
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
        this._child.heartbeat();
    }

    /** Shuts down the process */
    shutdown(callback) {
        this._child.shutdown(callback);
    }

    /** Initializes system object that represents child process.
     * Attaches to all relevant alerts. Sends init data to child process.
    */
    init(callback) {
        this._child.init(self._init, callback);
    }
}

/** Wrapper for "bolt" process */
class TopologyBoltInproc extends TopologyNodeInproc {

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
        this._child.emit({ cmd: "data", data: data });
    }
}

/** Wrapper for "spout" process */
class TopologySpoutInproc extends TopologyNodeInproc {

    /** Constructor needs to receive all data */
    constructor(config) {
        super(config);
        let self = this;
        self._emitCallback = config.onEmit || (() => { console.log("Empty emit cb"); });
        self._isPaused = true;
        self._nextTs = Date.now();

        self.on("data", (msg) => {
            self._nextPending = false;
            self._emitCallback(msg);
            self._nextCallback();
        });
        self.on("empty", () => {
            self._nextPending = false;
            self._nextTs = Date.now() + 1 * 1000; // sleep for 1sec if spout is empty
            self._nextCallback(null);
        });
    }

    /** Sends run signal and starts the "pump"" */
    run() {
        let self = this;
        this._isPaused = false;
        this._child.send({ cmd: "run" });
        async.whilst(
            () => { return !self._isPaused; },
            (xcallback) => {
                if (Date.now() < this._nextTs) {
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
        if (this._isPaused) {
            callback();
        } else {
            this._child.next((err, data) => {
                if (err) {
                    console.error(err);
                    callback();
                    return;
                }
                if (!data) {
                    self._nextTs = Date.now() + 1 * 1000; // sleep for 1sec if spout is empty
                }
                self._emitCallback(data);
                callback();
            });
        }
    }

    /** Sends pause signal to child */
    pause() {
        this._isPaused = true;
        this._child.pause();
    }
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyBoltInproc = TopologyBoltInproc;
exports.TopologySpoutInproc = TopologySpoutInproc;
