"use strict";

const async = require("async");
const path = require("path");
const cp = require("child_process");
const EventEmitter = require("events");

////////////////////////////////////////////////////////////////////

/** Wrapper for "spout" in-process */
class TopologySpoutInproc {

    /** Constructor needs to receive all data */
    constructor(config) {
        this._name = config.name;
        this._working_dir = path.resolve(config.working_dir); // path may be relative to current working dir
        this._cmd = config.cmd;
        this._args = config.args || [];
        this._init = config.init || {};

        this._isStarted = false;
        this._isClosed = false;
        this._isExit = false;
        this._isError = false;
        this._onExit = null;

        let self = this;
        try {
            let module_path = path.join(this._working_dir, this._cmd);
            this._child = require(module_path).create({});
            this._isStarted = true;
        } catch (e) {
            console.error("Error while creating an inproc spout", e);
            this._isStarted = true;
            this._isClosed = true;
            this._isExit = true;
            this._isError = true;
        }

        self._emitCallback = config.onEmit;
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
            this._child.next((err, data) => {
                if (err) {
                    console.error(err);
                    callback();
                    return;
                }
                if (!data) {
                    self._nextTs = Date.now() + 1 * 1000; // sleep for 1sec if spout is empty
                    callback();
                } else {
                    self._emitCallback(data, callback);
                }
            });
        }
    }

    /** Sends pause signal to child */
    pause() {
        this._isPaused = true;
        this._child.pause();
    }
}

/** Wrapper for "bolt" in-process */
class TopologyBoltInproc {

    /** Constructor needs to receive all data */
    constructor(config) {
        this._name = config.name;
        this._working_dir = path.resolve(config.working_dir); // path may be relative to current working dir
        this._cmd = config.cmd;
        this._args = config.args || [];
        this._init = config.init || {};
        this._init.onEmit = (data, callback) => {
            config.onEmit(data, callback);
        };

        this._isStarted = false;
        this._isClosed = false;
        this._isExit = false;
        this._isError = false;
        this._onExit = null;

        this._isPaused = true;

        this._inSend = false;
        this._pendingSendRequests = [];

        let self = this;
        try {
            let module_path = path.join(this._working_dir, this._cmd);
            this._child = require(module_path).create({});
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
        this._child.shutdown(callback);
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
    send(data, callback) {
        let self = this;
        if (self._inSend) {
            self._pendingSendRequests.push({
                data: data,
                callback: callback
            });
        } else {
            self._inSend = true;
            self._child.receive(data, (err) => {
                callback(err);
                self._inSend = false;
                if (self._pendingSendRequests.length > 0) {
                    let d = self._pendingSendRequests[0];
                    self._pendingSendRequests = self._pendingSendRequests.slice(1);
                    self.send(d.data, d.callback);
                }
            });
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyBoltInproc = TopologyBoltInproc;
exports.TopologySpoutInproc = TopologySpoutInproc;
