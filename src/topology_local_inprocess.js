"use strict";

const async = require("async");
const path = require("path");
const cp = require("child_process");
const EventEmitter = require("events");

const fb = require("./std_nodes/filter_bolt");
const cb = require("./std_nodes/console_bolt");
const ts = require("./std_nodes/timer_spout");

////////////////////////////////////////////////////////////////////

/** Wrapper for "spout" in-process */
class TopologySpoutInproc {

    /** Constructor needs to receive all data */
    constructor(config) {
        this._name = config.name;
        this._working_dir = config.working_dir;
        this._cmd = config.cmd;
        this._init = config.init || {};

        this._isStarted = false;
        this._isClosed = false;
        this._isExit = false;
        this._isError = false;
        this._onExit = null;

        let self = this;
        try {
            if (config.type == "sys") {
                this._child = this._createSysSpout(config);
            } else {
                this._working_dir = path.resolve(this._working_dir); // path may be relative to current working dir
                let module_path = path.join(this._working_dir, this._cmd);
                this._child = require(module_path).create({});
            }
            this._isStarted = true;
        } catch (e) {
            console.error("Error while creating an inproc spout", e);
            this._isStarted = true;
            this._isClosed = true;
            this._isExit = true;
            this._isError = true;
        }

        self._emitCallback = (data, stream_id, callback) => {
            config.onEmit(data, stream_id, callback);
        };
        self._isPaused = true;
        self._nextTs = Date.now();
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

    /** Initializes child object. */
    init(callback) {
        this._child.init(this._name, this._init, callback);
    }

    /** Sends run signal and starts the "pump"" */
    run() {
        let self = this;
        this._isPaused = false;
        this._child.run();
        async.whilst(
            () => { return !self._isPaused; },
            (xcallback) => {
                if (Date.now() < this._nextTs) {
                    let sleep = this._nextTs - Date.now();
                    setTimeout(() => { xcallback(); }, sleep);
                } else {
                    self._next(xcallback);
                }
            },
            () => { });
    }

    /** Requests next data message */
    _next(callback) {
        let self = this;
        if (this._isPaused) {
            callback();
        } else {
            this._child.next((err, data, stream_id) => {
                if (err) {
                    console.error(err);
                    callback();
                    return;
                }
                if (!data) {
                    self._nextTs = Date.now() + 1 * 1000; // sleep for 1sec if spout is empty
                    callback();
                } else {
                    self._emitCallback(data, stream_id, callback);
                }
            });
        }
    }

    /** Sends pause signal to child */
    pause() {
        this._isPaused = true;
        this._child.pause();
    }

    /** Factory method for sys spouts */
    _createSysSpout(spout_config) {
        switch (spout_config.cmd) {
            case "timer": return new ts.HeartbeatSpout();
            default: throw new Error("Unknown sys spout type:", spout_config.cmd);
        }
    }
}

/** Wrapper for "bolt" in-process */
class TopologyBoltInproc {

    /** Constructor needs to receive all data */
    constructor(config) {
        this._name = config.name;
        this._working_dir = config.working_dir;
        this._cmd = config.cmd;
        this._init = config.init || {};
        this._init.onEmit = (data, stream_id, callback) => {
            config.onEmit(data, stream_id, callback);
        };

        this._isStarted = false;
        this._isClosed = false;
        this._isExit = false;
        this._isError = false;
        this._onExit = null;

        this._isPaused = true;

        this._inSend = false;
        this._pendingSendRequests = [];
        this._pendingShutdownCallback = null;

        let self = this;
        try {
            if (config.type == "sys") {
                this._child = this._createSysBolt(config);
            } else {
                this._working_dir = path.resolve(this._working_dir); // path may be relative to current working dir
                let module_path = path.join(this._working_dir, this._cmd);
                this._child = require(module_path).create({});
            }
            this._isStarted = true;
        } catch (e) {
            console.error("Error while creating an inproc bolt", e);
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

    /** Shuts down the child */
    shutdown(callback) {
        if (!this._inSend) {
            return this._child.shutdown(callback);
        } else {
            this._pendingShutdown = callback;
        }
    }

    /** Initializes child object. */
    init(callback) {
        this._child.init(this._name, this._init, callback);
    }

    /** Sends run signal and starts the "pump"" */
    run() {
        this._isPaused = false;
        this._child.run();
    }

    /** Sends pause signal to child */
    pause() {
        this._isPaused = true;
        this._child.pause();
    }

    /** Sends data to child object. */
    receive(data, stream_id, callback) {
        let self = this;
        if (self._inSend) {
            self._pendingSendRequests.push({
                data: data,
                stream_id: stream_id,
                callback: callback
            });
        } else {
            self._inSend = true;
            self._child.receive(data, stream_id, (err) => {
                callback(err);
                self._inSend = false;
                if (self._pendingSendRequests.length > 0) {
                    let d = self._pendingSendRequests[0];
                    self._pendingSendRequests = self._pendingSendRequests.slice(1);
                    self.receive(d.data, stream_id, d.callback);
                } else if (self._pendingShutdownCallback) {
                    self.shutdown(self._pendingShutdownCallback);
                }
            });
        }
    }

    /** Factory method for sys bolts */
    _createSysBolt(bolt_config) {
        switch (bolt_config.cmd) {
            case "console": return new cb.ConsoleBolt();
            case "filter": return new fb.FilterBolt();
            default: throw new Error("Unknown sys bolt type:", bolt_config.cmd);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyBoltInproc = TopologyBoltInproc;
exports.TopologySpoutInproc = TopologySpoutInproc;
