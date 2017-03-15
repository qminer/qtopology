"use strict";

const async = require("async");
const cp = require("child_process");
const EventEmitter = require("events");
const tel = require("./util/telemetry");

////////////////////////////////////////////////////////////////////

/** Base class for communication with underlaying process */
class TopologyNode extends EventEmitter {

    /** Constructor needs to receive basic data */
    constructor(config) {
        super();
        this._name = config.name;
        this._working_dir = config.working_dir;
        this._cmd = config.cmd;
        this._init = config.init || {};
        this._init.name = config.name;

        this._isStarted = false;
        this._isClosed = false;
        this._isExit = false;
        this._isError = false;
        this._onExit = null;

        this._pendingInitCallback = null;

        this._telemetry = new tel.Telemetry(config.name);
        this._telemetry_total = new tel.Telemetry(config.name);
        this._telemetry_callback = null;

        try {
            this._child = cp.fork(this._cmd, [], { cwd: this._working_dir });
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
        let self = this;
        this._child.send({ cmd: "heartbeat" });

        // emit telemetry
        self._telemetry_callback(self._telemetry.get(), "$telemetry");
        self._telemetry.reset();
        self._telemetry_callback(self._telemetry_total.get(), "$telemetry-total");
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

    /** Adds duration to internal telemetry */
    _telemetryAdd(duration) {
        this._telemetry.add(duration);
        this._telemetry_total.add(duration);
    }
}

/** Wrapper for "spout" process */
class TopologySpout extends TopologyNode {

    /** Constructor needs to receive all data */
    constructor(config) {
        super(config);
        let self = this;
        self._emitCallback = config.onEmit;
        self._isPaused = true;
        self._nextCallback = null;
        self._nextTs = Date.now();
        self._nextCalledTs = null;
        self._telemetry_callback = (data, stream_id) => {
            self._emitCallback(data, stream_id, () => { });
        };

        self.on("data", (msg) => {
            self._telemetryAdd(Date.now() - self._nextCalledTs);
            // data was received from child process, send it into topology
            self._emitCallback(msg.data.data, msg.data.stream_id, () => {
                // only call callback when topology signals that processing is done
                let cb = self._nextCallback;
                self._nextCallback = null;
                cb();
            });
        });
        self.on("empty", () => {
            self._nextTs = Date.now() + 1 * 1000; // sleep for 1sec if spout is empty
            let cb = self._nextCallback;
            self._nextCallback = null;
            cb();
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
        if (this._nextCallback) {
            throw new Error("Callback for next() is non-null.");
        }
        if (this._isPaused) {
            callback();
        } else {
            this._nextCallback = callback;
            this._nextCalledTs = Date.now();
            this._child.send({ cmd: "next" });
        }
    }

    /** Sends pause signal */
    pause() {
        this._isPaused = true;
        this._child.send({ cmd: "pause" });
    }
}

/** Wrapper for "bolt" process */
class TopologyBolt extends TopologyNode {

    /** Constructor needs to receive all data */
    constructor(config) {
        super(config);
        let self = this;

        this._emitCallback = (data, stream_id, callback) => {
            config.onEmit(data, stream_id, callback);
        };

        this._inReceive = false; // this field can be true even when _ackCallback is null
        this._pendingReceiveRequests = [];
        this._ackCallback = null;
        this._telemetry_callback = (data, stream_id) => {
            self._emitCallback(data, stream_id, () => { });
        };

        this.on("data", (msg) => {
            let id = msg.data.id;
            self._emitCallback(msg.data.data, msg.data.stream_id, (err) => {
                self._child.send({ cmd: "ack", data: { id: id } });
            });
        });
        this.on("ack", () => {
            self._ackCallback();
            self._ackCallback = null;
            self._inReceive = false;
            if (self._pendingReceiveRequests.length > 0) {
                let d = self._pendingReceiveRequests[0];
                self._pendingReceiveRequests = self._pendingReceiveRequests.slice(1);
                self._receive(d.data, d.stream_id, true, d.callback);
            }
        });
    }

    /** Sends data tuple to child process - wrapper for internal method _receive() */
    receive(data, stream_id, callback) {
        this._receive(data, stream_id, false, callback);
    }

    /** Internal method - sends data tuple to child process */
    _receive(data, stream_id, from_waitlist, callback) {
        let self = this;
        let ts_start = Date.now();
        if (self._inReceive) {
            self._pendingReceiveRequests.push({
                data: data,
                stream_id: stream_id,
                callback: (err) => {
                    self._telemetryAdd(Date.now() - ts_start);
                    callback(err);
                }
            });
        } else {
            self._inReceive = true;
            self._ackCallback = (err) => {
                if (!from_waitlist) {
                    self._telemetryAdd(Date.now() - ts_start);
                }
                callback();
            };
            self._child.send({ cmd: "data", data: { data: data, stream_id: stream_id } });
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyBolt = TopologyBolt;
exports.TopologySpout = TopologySpout;
