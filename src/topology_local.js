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
            self._emitCallback(msg);
            self._nextCallback();
        });
        self.on("empty", () => {
            self._nextPending = false;
            self._empty = true;
            self._nextTs = Date.now() + 1 * 1000; // sleep for 1sec if spout is empty
            self._nextCallback(null);
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

/** Class that perform redirection of messages after they are emited from nodes */
class OutputRouter {

    /** Constructor prepares the object before any information is received. */
    constructor() {
        this._sources = {};
    }

    /**
     * This method registers binding between source and destination
     * @param {string} source - Name of source
     * @param {string} destination - Name of destination
     */
    register(source, destination) {
        if (!this._sources[source]) {
            this._sources[source] = [];
        }
        this._sources[source].push(destination);
    }

    /** Returns list of names that are destinations for data, emitted by source.
     * @param {*} source - Name of source
     */
    getDestinationsForSource(source) {
        return this._sources[source] || [];
    }
}

/** This class runs local topology */
class TopologyLocal {

    /** Constructor prepares the object before any information is received. */
    constructor() {
        this._spouts = [];
        this._bolts = [];
        this._config = null;
        this._heartbeatTimeout = 10000;
        this._router = new OutputRouter();

        this._isRunning = false;
        this._isShuttingDown = false;
    }

    /** Initialization that sets up internal structure and
     * starts underlaying processes.
     */
    init(config, callback) {
        let self = this;
        self._config = config;
        self._heartbeatTimeout = config.general.heartbeat;
        let tasks = [];
        self._config.bolts.forEach((bolt_config) => {
            bolt_config.onEmit = (data) => {
                self._redirect(bolt_config.name, data);
            };
            let bolt = new TopologyBolt(bolt_config);
            self._bolts.push(bolt);
            tasks.push((xcallback) => { bolt.init(xcallback); });
            for (let input of bolt_config.inputs) {
                self._router.register(input.source, bolt_config.name);
            }
        });
        self._config.spouts.forEach((spout_config) => {
            spout_config.onEmit = (data) => {
                self._redirect(spout_config.name, data);
            };
            let spout = new TopologySpout(spout_config);
            self._spouts.push(spout);
            tasks.push((xcallback) => { spout.init(xcallback); });
        });
        self._runHeartbeat();
        async.series(tasks, callback);
    }

    /** Sends run signal to all spouts */
    run() {
        console.log("Local topology started");
        for (let spout of this._spouts) {
            spout.run();
        }
        this._isRunning = true;
    }

    /** Sends pause signal to all spouts */
    pause(callback) {
        for (let spout of this._spouts) {
            spout.pause();
        }
        this._isRunning = false;
        callback();
    }

    /** Sends shutdown signal to all child processes */
    shutdown(callback) {
        this._isShuttingDown = true;
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

    /** Runs heartbeat pump until this object shuts down */
    _runHeartbeat() {
        let self = this;
        async.whilst(
            () => {
                return !self._isShuttingDown;
            },
            (xcallback) => {
                setTimeout(
                    () => {
                        if (self._isRunning) {
                            self._heartbeat();
                        }
                        xcallback();
                    },
                    self._heartbeatTimeout);
            },
            () => { }
        );
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

    /** This method redirects/broadcasts message from source to other nodes.
     * @param {string} source - Name of the source that emitted this data
     * @param {Object} data - Data content of the message
     */
    _redirect(source, data) {
        let destinations = this._router.getDestinationsForSource(source);
        for (let destination of destinations) {
            this._getBolt(destination).send(data);
        }
    }

    /** Find bolt with given name.
     * @param {string} name - Name of the bolt that we need to find
     */
    _getBolt(name) {
        let hits = this._bolts.filter(x => x.getName() == name);
        if (hits.length === 0) {
            return null;
        }
        return hits[0];
    }
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyLocal = TopologyLocal;
