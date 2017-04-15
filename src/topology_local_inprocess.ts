import * as intf from "./topology_interfaces";

import * as async from "async";
import * as path from "path";
import * as cp from "child_process";
import * as EventEmitter from "events";

import * as fb from "./std_nodes/filter_bolt";
import * as pb from "./std_nodes/post_bolt";
import * as cb from "./std_nodes/console_bolt";
import * as ab from "./std_nodes/attacher_bolt";
import * as gb from "./std_nodes/get_bolt";
import * as rb from "./std_nodes/router_bolt";

import * as rs from "./std_nodes/rest_spout";
import * as ts from "./std_nodes/timer_spout";
import * as gs from "./std_nodes/get_spout";
import * as tss from "./std_nodes/test_spout";

import * as tel from "./util/telemetry";

/** Wrapper for "spout" in-process */
export class TopologySpoutInproc {

    _name: string;
    _context: any;
    _working_dir: string;
    _cmd: string;
    _init: any
    _isStarted: boolean;
    _isClosed: boolean;
    _isExit: boolean;
    _isError: boolean;
    _onExit: boolean;
    _isPaused: boolean;
    _nextTs: number;

    _telemetry: tel.Telemetry;
    _telemetry_total: tel.Telemetry;

    _child: intf.Spout;
    _emitCallback: intf.BoltEmitCallback;

    /** Constructor needs to receive all data */
    constructor(config, context: any) {
        this._name = config.name;
        this._context = context;
        this._working_dir = config.working_dir;
        this._cmd = config.cmd;
        this._init = config.init || {};

        this._isStarted = false;
        this._isClosed = false;
        this._isExit = false;
        this._isError = false;
        this._onExit = null;

        this._telemetry = new tel.Telemetry(config.name);
        this._telemetry_total = new tel.Telemetry(config.name);

        let self = this;
        try {
            if (config.type == "sys") {
                this._child = this._createSysSpout(config, context);
            } else {
                this._working_dir = path.resolve(this._working_dir); // path may be relative to current working dir
                let module_path = path.join(this._working_dir, this._cmd);
                this._child = require(module_path).create(context);
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
    getName(): string {
        return this._name;
    }

    /** Handler for heartbeat signal */
    heartbeat() {
        let self = this;
        self._child.heartbeat();

        // emit telemetry
        self._emitCallback(self._telemetry.get(), "$telemetry", () => { });
        self._telemetry.reset();
        self._emitCallback(self._telemetry_total.get(), "$telemetry-total", () => { });
    }

    /** Shuts down the process */
    shutdown(callback: intf.SimpleCallback) {
        this._child.shutdown(callback);
    }

    /** Initializes child object. */
    init(callback: intf.SimpleCallback) {
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
    _next(callback: intf.SimpleCallback) {
        let self = this;
        if (this._isPaused) {
            callback();
        } else {
            let ts_start = Date.now();
            this._child.next((err, data, stream_id, xcallback) => {
                self._telemetryAdd(Date.now() - ts_start);
                if (err) {
                    console.error(err);
                    callback();
                    return;
                }
                if (!data) {
                    self._nextTs = Date.now() + 1 * 1000; // sleep for 1 sec if spout is empty
                    callback();
                } else {
                    self._emitCallback(data, stream_id, (err) => {
                        // in case child object expects confirmation call for this tuple
                        if (xcallback) {
                            xcallback(err, callback);
                        } else {
                            callback();
                        }
                    });
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
    _createSysSpout(spout_config: any, context: any): intf.Spout {
        switch (spout_config.cmd) {
            case "timer": return new ts.TimerSpout();
            case "get": return new gs.GetSpout();
            case "rest": return new rs.RestSpout();
            case "test": return new tss.TestSpout();
            default: throw new Error("Unknown sys spout type: " + spout_config.cmd);
        }
    }

    /** Adds duration to internal telemetry */
    _telemetryAdd(duration: number) {
        this._telemetry.add(duration);
        this._telemetry_total.add(duration);
    }
}

/** Wrapper for "bolt" in-process */
export class TopologyBoltInproc {

    _name: string;
    _context: any;
    _working_dir: string;
    _cmd: string;
    _init: any
    _isStarted: boolean;
    _isClosed: boolean;
    _isExit: boolean;
    _isError: boolean;
    _onExit: boolean;
    _isPaused: boolean;
    _isShuttingDown: boolean;
    _nextTs: number;
    _allow_parallel: boolean;
    _inSend: number;
    _pendingSendRequests: any[];
    _pendingShutdownCallback: intf.SimpleCallback;

    _telemetry: tel.Telemetry;
    _telemetry_total: tel.Telemetry;

    _child: intf.Bolt;
    _emitCallback: intf.BoltEmitCallback;

    /** Constructor needs to receive all data */
    constructor(config, context: any) {
        let self = this;
        this._name = config.name;
        this._context = context;
        this._working_dir = config.working_dir;
        this._cmd = config.cmd;
        this._init = config.init || {};
        this._init.onEmit = (data, stream_id, callback) => {
            if (self._isShuttingDown) {
                return callback("Bolt is shutting down:", self._name);
            }
            config.onEmit(data, stream_id, callback);
        };
        this._emitCallback = this._init.onEmit;
        this._allow_parallel = config.allow_parallel || false;

        this._isStarted = false;
        this._isShuttingDown = false;
        this._isClosed = false;
        this._isExit = false;
        this._isError = false;
        this._onExit = null;

        this._inSend = 0;
        this._pendingSendRequests = [];
        this._pendingShutdownCallback = null;

        this._telemetry = new tel.Telemetry(config.name);
        this._telemetry_total = new tel.Telemetry(config.name);

        try {
            if (config.type == "sys") {
                this._child = this._createSysBolt(config, context);
            } else {
                this._working_dir = path.resolve(this._working_dir); // path may be relative to current working dir
                let module_path = path.join(this._working_dir, this._cmd);
                this._child = require(module_path).create(context);
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
    getName(): string {
        return this._name;
    }

    /** Handler for heartbeat signal */
    heartbeat() {
        let self = this;
        self._child.heartbeat();

        // emit telemetry
        self._emitCallback(self._telemetry.get(), "$telemetry", () => { });
        self._telemetry.reset();
        self._emitCallback(self._telemetry_total.get(), "$telemetry-total", () => { });
    }

    /** Shuts down the child */
    shutdown(callback: intf.SimpleCallback) {
        this._isShuttingDown = true;
        if (this._inSend === 0) {
            return this._child.shutdown(callback);
        } else {
            this._pendingShutdownCallback = callback;
        }
    }

    /** Initializes child object. */
    init(callback: intf.SimpleCallback) {
        this._child.init(this._name, this._init, callback);
    }

    /** Sends data to child object. */
    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        let self = this;
        let ts_start = Date.now();
        if (self._inSend > 0 && !self._allow_parallel) {
            self._pendingSendRequests.push({
                data: data,
                stream_id: stream_id,
                callback: (err) => {
                    self._telemetryAdd(Date.now() - ts_start);
                    callback(err);
                }
            });
        } else {
            self._inSend++;
            self._child.receive(data, stream_id, (err) => {
                callback(err);
                self._inSend--;
                if (self._inSend === 0) {
                    if (self._pendingSendRequests.length > 0) {
                        let d = self._pendingSendRequests[0];
                        self._pendingSendRequests = self._pendingSendRequests.slice(1);
                        self.receive(d.data, stream_id, d.callback);
                    } else if (self._pendingShutdownCallback) {
                        self.shutdown(self._pendingShutdownCallback);
                        self._pendingShutdownCallback = null;
                    }
                }
            });
        }
    }

    /** Factory method for sys bolts */
    _createSysBolt(bolt_config: any, context: any) {
        switch (bolt_config.cmd) {
            case "console": return new cb.ConsoleBolt();
            case "filter": return new fb.FilterBolt();
            case "attacher": return new ab.AttacherBolt();
            case "post": return new pb.PostBolt();
            case "get": return new gb.GetBolt();
            case "router": return new rb.RouterBolt();
            default: throw new Error("Unknown sys bolt type: " + bolt_config.cmd);
        }
    }

    /** Adds duration to internal telemetry */
    _telemetryAdd(duration: number) {
        this._telemetry.add(duration);
        this._telemetry_total.add(duration);
    }
}
