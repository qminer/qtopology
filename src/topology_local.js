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
        self._child.on("error", (e) => {
            self._isError = true;
            self.emit("error", e);
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
        });
        self._child.on("message", (msg) => {
            if (msg.cmd == "init_completed") {
                callback();
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
        this.on("emit", (msg) => {
            if (self._emitCallback) {
                self._emitCallback(null, msg);
            }
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
        this._isPaused = true;
        this._nextPending = false;
        this._empty = true;
        this._nextCallback = null;
        this._nextTs = Date.now();

        this.on("emit", (msg) => {
            this._nextPending = false;
            if (this._nextCallback) {
                this._nextCallback(null, msg);
            }
        });
        this.on("empty", (msg) => {
            this._nextPending = false;
            this._empty = true;
            if (this._nextCallback) {
                this._nextCallback(null, null);
            }
            this._nextTs = Date.now() + 1 * 1000;
        });
    }

    /** Check if spout can be queried. */
    canQuery() {
        return !this.isNextPending() && Date.now() >= this._nextTs;
    }

    /** Returns true if next command is pending */
    isNextPending() {
        return this._nextPending;
    }

    /** Returns true if there was no new data during last call. */
    isEmpty() {
        return this._empty;
    }

    /** Sends run signal and starts the "pump"" */
    run() {
        let self = this;
        this._isPaused = false;
        this._empty = true;
        async.whilst(
            () => { return !self._isPaused; },
            (xcallback) => {
                if (Date.now() < this._nextTs) {
                    // is empty, sleep for a while
                    setTimeout(function () {
                        xcallback();
                    }, this._nextTs - Date.now());
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
            this._child.send({ cmd: "next" });
            this._nextCallback = callback;
        }
    }

    /** Sends pause signal */
    pause() {
        this._isPaused = true;
    }
}

/** This class runs local topology */
class TopologyLocal {

    /** Constructor prepares the object before any information is received. */
    constructor() {
        this._spouts = [];
        this._bolts = [];
        this._config = null;
    }

    /** Initialization that sets up internal structure and starts underlaying processes */
    init(config, callback) {
        this._config = config;
        let tasks = [];
        this._config.bolts.forEach((bolt_config) => {
            let bolt = new TopologyBolt(bolt_config);
            this._bolts.push(bolt);
            tasks.push((xcallback) => { bolt.init(xcallback); });
        });
        this._config.spouts.forEach((spout_config) => {
            let spout = new TopologySpout(spout_config);
            this._spouts.push(spout);
            tasks.push((xcallback) => { spout.init(xcallback); });
        });
        async.series(tasks, callback);
    }

    /** Sends run signal to all spouts */
    run() {
        console.log("Local topology started");
        for (let spout of this._spouts) {
            spout.run();
        }
        let self = this;
    }

    /** Sends pause signal to all spouts */
    pause(callback) {
        for (let spout of this._spouts) {
            spout.pause();
        }
        callback();
    }

    /** Sends shutdown signal to all child processes */
    shutdown(callback) {
        this.pause((err) => {
            let tasks = [];
            this._spouts.forEach((spout) => {
                tasks.push((xcallback) => {
                    spout.shutdown(xcallback);
                });
            });
            this._bolts.forEach((bolt) => {
                tasks.push((xcallback) => {
                    bolt.shutdown(xcallback);
                });
            });
            async.series(tasks, callback);
        });
    }

    /** Sends heartbeat signal to all child processes */
    _heartbeat() {
        for (let spout of this._spouts) {
            spout.heartbeat();
        }
        for (let bolt of this._bolts) {
            bolt.heartbeat();
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyLocal = TopologyLocal;
