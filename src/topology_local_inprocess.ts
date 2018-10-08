import * as intf from "./topology_interfaces";

import * as async from "async";
import * as path from "path";

import * as fb from "./std_nodes/filter_bolt";
import * as pb from "./std_nodes/post_bolt";
import * as cb from "./std_nodes/console_bolt";
import * as ab from "./std_nodes/attacher_bolt";
import * as ac from "./std_nodes/accumulator_bolt";
import * as tb from "./std_nodes/transform_bolt";
import * as gb from "./std_nodes/get_bolt";
import * as rb from "./std_nodes/router_bolt";
import * as bb from "./std_nodes/bomb_bolt";
import * as fab from "./std_nodes/file_append_bolt";
import * as fab2 from "./std_nodes/file_append_bolt_ex";
import * as cntb from "./std_nodes/counter_bolt";
import * as ttb from "./std_nodes/type_transform_bolt";
import * as prb from "./std_nodes/process_bolt";

import * as frs from "./std_nodes/file_reader_spout";
import * as ps from "./std_nodes/process_spout";
import * as rs from "./std_nodes/rest_spout";
import * as ts from "./std_nodes/timer_spout";
import * as gs from "./std_nodes/get_spout";
import * as rss from "./std_nodes/rss_spout";
import * as tss from "./std_nodes/test_spout";
import * as ds from "./std_nodes/dir_watcher_spout";

import * as tel from "./util/telemetry";
import * as log from "./util/logger";

const NEXT_SLEEP_TIMEOUT: number = 1 * 1000; // number of miliseconds to "sleep" when spout.next() returned no data

/** Base class for spouts and bolts - contains telemetry support */
export class TopologyNodeBase {

    protected name: string;
    private telemetry_next_emit: number;
    private telemetry_timeout: number;
    private telemetry: tel.Telemetry;
    private telemetry_total: tel.Telemetry;
    protected isError: boolean;
    protected firstErrorMessage: string;
    protected errorCallback: intf.SimpleCallback; // used for functions without callbacks

    constructor(name: string, telemetry_timeout: number) {
        this.name = name;
        this.telemetry = new tel.Telemetry(name);
        this.telemetry_total = new tel.Telemetry(name);
        this.telemetry_next_emit = Date.now();
        this.telemetry_timeout = telemetry_timeout || 60 * 1000;
        this.firstErrorMessage = "";
    }

    /** This method checks if telemetry data should be emitted
     * and calls provided callback if that is the case.
     */
    telemetryHeartbeat(emitCallback: (msg: any, stream_id: string) => void) {
        let now = Date.now();
        if (now >= this.telemetry_next_emit) {
            let msg = {
                name: this.name,
                ts: Date.now(),
                total: this.telemetry_total.get(),
                last: this.telemetry.get()
            }
            emitCallback(msg, "$telemetry");
            this.telemetry.reset();
            this.telemetry_next_emit = now + this.telemetry_timeout;
        }
    }

    /** Adds duration to internal telemetry */
    telemetryAdd(duration: number) {
        this.telemetry.add(duration);
        this.telemetry_total.add(duration);
    }

    /** helper function that sets isError flag when a callback is called with an error */
    protected wrapCallbackSetError(callback: intf.SimpleCallback): intf.SimpleCallback {
        let self = this;
        return (err?: Error) => {
            if (err) {
                self.isError = true;
                if (self.firstErrorMessage == "") {
                    self.firstErrorMessage = err.message;
                }
                log.logger().error("Internal error in " + self.name + ". Setting error flag.");
                log.logger().exception(err);
            }
            try {
                callback(err);
            } catch (e) {
                log.logger().error("THIS SHOULD NOT HAPPEN: exception THROWN in callback!");
                log.logger().exception(e);
            }
        }
    }
}

/** Wrapper for spout */
export class TopologySpoutWrapper extends TopologyNodeBase {

    private context: any;
    private working_dir: string;
    private cmd: string;
    private subtype: string;
    private init_params: any;
    private isPaused: boolean;
    private isShuttingDown: boolean;
    private initCalled: boolean;
    private nextTs: number;

    private spout: intf.Spout;
    private emitCallback: intf.BoltEmitCallback;

    /** Constructor needs to receive all data */
    constructor(config, context: any) {
        super(config.name, config.telemetry_timeout);

        this.name = config.name;
        this.context = context;
        this.working_dir = config.working_dir;
        this.cmd = config.cmd;
        this.subtype = config.subtype;
        this.init_params = config.init || {};
        this.isError = false;

        let self = this;
        try {
            if (config.type == "sys") {
                this.spout = createSysSpout(config);
            } else if (config.type == "module_class") {
                this.makeWorkingDirAbsolute();
                let module = require(this.working_dir);
                this.spout = new module[this.cmd](this.subtype);
            } else if (config.type == "module_method") {
                this.makeWorkingDirAbsolute();
                let module = require(this.working_dir);
                this.spout = module[this.cmd](this.subtype);
                if (!this.spout) {
                    throw new Error(`Spout factory returned null: ${this.working_dir}, cmd=${this.cmd}, subtype=${this.subtype}`);
                }
            } else {
                this.working_dir = path.resolve(this.working_dir); // path may be relative to current working dir
                let module_path = path.join(this.working_dir, this.cmd);
                this.spout = require(module_path).create(this.subtype);
                if (!this.spout) {
                    throw new Error(`Spout factory returned null: ${module_path}, subtype=${this.subtype}`);
                }
            }
        } catch (e) {
            log.logger().error(`Error while creating an inproc spout (${this.name})`);
            log.logger().exception(e);
            throw e;
        }

        self.emitCallback = (data, stream_id, callback) => {
            config.onEmit(data, stream_id, callback);
        };
        self.errorCallback = config.onError || (() => { });
        self.errorCallback = self.wrapCallbackSetError(self.errorCallback);
        self.isPaused = true;
        self.isShuttingDown = false;
        self.nextTs = Date.now();
    }

    /** Utility function for making working dir absolute - used to avoid some problematic situations */
    private makeWorkingDirAbsolute() {
        if (!path.isAbsolute(this.working_dir)){
            this.working_dir = path.resolve(this.working_dir);
        }
    }

    /** Returns name of this node */
    getName(): string {
        return this.name;
    }

    /** Returns inner spout object */
    getSpoutObject(): intf.Spout {
        return this.spout;
    }

    /** Handler for heartbeat signal */
    heartbeat() {
        let self = this;
        if (self.isError) return;
        if (self.isPaused) return;
        try {
            self.spout.heartbeat();
        } catch (e) {
            log.logger().error(`Error in spout (${this.name}) heartbeat`);
            log.logger().exception(e);
            return self.errorCallback(e);
        }
        self.telemetryHeartbeat((msg, stream_id) => {
            self.emitCallback(msg, stream_id, () => { });
        });
    }

    /** Shuts down the process */
    shutdown(callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError) { return callback(new Error(`Spout (${this.name}) has error flag set. Shutdown refused. Last error: ${this.firstErrorMessage}`)); }
        // without an exception the caller will think that everything shut down nicely already when we call shutdown twice by mistake
        if (this.isShuttingDown) { return callback(new Error(`Spout (${this.name}) is already shutting down.`)); }
        this.isShuttingDown = true;
        try {
            this.spout.shutdown(callback);
        } catch (e) {
            log.logger().error(`Unhandled error in spout (${this.name}) shutdown`);
            log.logger().exception(e);
            return callback(e);
        }
    }

    /** Initializes child object. */
    init(callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError) { return callback(new Error(`Spout (${this.name}) has error flag set. Init refused. Last error: ${this.firstErrorMessage}`)); }
        if (this.initCalled) { return callback(new Error(`Init already called in spout (${this.name})`)); }
        this.initCalled = true;
        try {
            this.spout.init(this.name, this.init_params, this.context, callback);
        } catch (e) {
            log.logger().error(`Unhandled error in spout (${this.name}) init`);
            log.logger().exception(e);
            callback(e);
        }
    }

    /** Sends run signal and starts the "pump" */
    run() {
        let self = this;
        if (!this.isPaused) return; // already running
        this.isPaused = false;
        try {
            this.spout.run();
        } catch (e) {
            log.logger().error(`Error in spout (${this.name}) run`);
            log.logger().exception(e);
            self.errorCallback(e);
            return;
        }
        async.whilst(
            () => { return !self.isPaused && !self.isError; },
            (xcallback) => {
                if (Date.now() < this.nextTs) {
                    let sleep = this.nextTs - Date.now();
                    setTimeout(() => { xcallback(); }, sleep);
                } else {
                    self.next(xcallback);
                }
            },
            (err: Error) => {
                if (err) {
                    log.logger().error(`Error in spout (${this.name}) next`);
                    log.logger().exception(err);
                    self.errorCallback(err);
                }
            });
    }

    /** Requests next data message */
    private next(callback: intf.SimpleCallback) {
        let self = this;
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (self.isPaused || self.isError) {
            // run will stop calling next when isError is true
            return callback();
        } else {
            let ts_start = Date.now();
            setImmediate(() => {
                try {
                    this.spout.next((err, data, stream_id) => {
                        self.telemetryAdd(Date.now() - ts_start);
                        if (err) {
                            log.logger().exception(err);
                            return callback(err);
                        }
                        if (!data) {
                            self.nextTs = Date.now() + NEXT_SLEEP_TIMEOUT;
                            return callback();
                        } else {
                            try {
                                self.emitCallback(data, stream_id, callback);
                            } catch (e) {
                                // there was an error, don't call the child's xcallback
                                return callback(e);
                            }
                        }
                    });
                } catch (e) {
                    return callback(e);
                }
            });
        }
    }

    /** Sends pause signal to child */
    pause() {
        if (this.isPaused) return; // already paused
        this.isPaused = true;
        try {
            this.spout.pause();
        } catch (e) {
            log.logger().error(`Error in spout (${this.name}) pause`);
            log.logger().exception(e);
            this.errorCallback(e);
        }
    }

    /** Factory method for sys spouts */
    static createSysSpout(spout_config: any) {
        switch (spout_config.cmd) {
            case "timer": return new ts.TimerSpout();
            case "get": return new gs.GetSpout();
            case "rest": return new rs.RestSpout();
            case "dir": return new ds.DirWatcherSpout();
            case "file_reader": return new frs.FileReaderSpout();
            case "process": return new ps.ProcessSpout();
            case "process-continuous": return new ps.ProcessSpoutContinuous();
            case "rss": return new rss.RssSpout();
            case "test": return new tss.TestSpout();
            default: throw new Error("Unknown sys spout type: " + spout_config.cmd);
        }
    }
}

/** Wrapper for bolt */
export class TopologyBoltWrapper extends TopologyNodeBase {

    private context: any;
    private working_dir: string;
    private cmd: string;
    private subtype: string;
    private init_params: any;
    private isShuttingDown: boolean;
    private initCalled: boolean;
    private allow_parallel: boolean;
    private inSend: number;
    private pendingSendRequests: any[];
    private pendingShutdownCallback: intf.SimpleCallback;

    private bolt: intf.Bolt; // TODO rename child to bolt
    private emitCallback: intf.BoltEmitCallback;

    /** Constructor needs to receive all data */
    constructor(config, context: any) {
        super(config.name, config.telemetry_timeout);
        let self = this;
        this.name = config.name;
        this.context = context;
        this.working_dir = config.working_dir;
        this.cmd = config.cmd;
        this.subtype = config.subtype;
        this.isError = false;
        this.init_params = config.init || {};
        this.init_params.onEmit = (data, stream_id, callback) => {
            config.onEmit(data, stream_id, callback);
        };
        this.emitCallback = this.init_params.onEmit;
        this.errorCallback = config.onError || (() => { });
        self.errorCallback = self.wrapCallbackSetError(self.errorCallback);
        this.allow_parallel = config.allow_parallel || false;

        this.isShuttingDown = false;

        this.inSend = 0;
        this.pendingSendRequests = [];
        this.pendingShutdownCallback = null;

        try {
            if (config.type == "sys") {
                this.bolt = createSysBolt(config);
            } else if (config.type == "module_class") {
                this.makeWorkingDirAbsolute();
                let module = require(this.working_dir);
                this.bolt = new module[this.cmd](this.subtype);
            } else if (config.type == "module_method") {
                this.makeWorkingDirAbsolute();
                let module = require(this.working_dir);
                this.bolt = module[this.cmd](this.subtype);
                if (!this.bolt) {
                    throw new Error(`Bolt factory returned null: ${this.working_dir}, cmd=${this.cmd}, subtype=${this.subtype}`);
                }
            } else {
                this.working_dir = path.resolve(this.working_dir); // path may be relative to current working dir
                let module_path = path.join(this.working_dir, this.cmd);
                this.bolt = require(module_path).create(this.subtype);
                if (!this.bolt) {
                    throw new Error(`Bolt factory returned null: ${module_path}, subtype=${this.subtype}`);
                }
            }
        } catch (e) {
            log.logger().error(`Error while creating an inproc bolt (${this.name})`);
            log.logger().exception(e);
            throw e;
        }
    }

    /** Utility function for making working dir absolute - used to avoid some problematic situations */
    private makeWorkingDirAbsolute() {
        if (!path.isAbsolute(this.working_dir)){
            this.working_dir = path.resolve(this.working_dir);
        }
    }

    /** Returns name of this node */
    getName(): string {
        return this.name;
    }

    /** Returns inner bolt object */
    getBoltObject(): intf.Bolt {
        return this.bolt;
    }

    /** Handler for heartbeat signal */
    heartbeat() {
        let self = this;
        if (self.isError) return;
        try {
            self.bolt.heartbeat();
        } catch (e) {
            log.logger().error(`Error in bolt (${this.name}) heartbeat`);
            log.logger().exception(e);
            self.errorCallback(e);
            return;
        }
        self.telemetryHeartbeat((msg, stream_id) => {
            self.emitCallback(msg, stream_id, () => { });
        });
    }

    /** Shuts down the child */
    shutdown(callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError) { return callback(new Error(`Bolt (${this.name}) has error flag set. Shutdown refused. Last error: ${this.firstErrorMessage}`)); }
        // without an exception the caller will think that everything shut down nicely already when we call shutdown twice by mistake
        if (this.isShuttingDown) { return callback(new Error(`Bolt (${this.name}) is already shutting down.`)); }
        this.isShuttingDown = true;
        try {
            if (this.inSend === 0) {
                return this.bolt.shutdown(callback);
            } else {
                let cb = () => { this.bolt.shutdown(callback); };
                this.pendingShutdownCallback =  cb;
            }
        } catch (e) {
            callback(e);
        }
    }

    /** Initializes child object. */
    init(callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError) { return callback(new Error(`Bolt (${this.name}) has error flag set. Init refused. Last error: ${this.firstErrorMessage}`)); }
        if (this.initCalled) { return callback(new Error(`Bolt (${this.name}) init already called.`)); }
        this.initCalled = true;
        try {
            this.bolt.init(this.name, this.init_params, this.context, callback);
        } catch (e) {
            log.logger().error(`Error in bolt (${this.name}) init`);
            log.logger().exception(e);
            callback(e);
        }
    }

    /** Sends data to child object. */
    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        let self = this;
        if (self.isError) { return callback(new Error(`Bolt ${self.name} has error flag set. Last error: ${this.firstErrorMessage}`)); }
        let ts_start = Date.now();
        if (self.inSend > 0 && !self.allow_parallel) {
            self.pendingSendRequests.push({
                data: data,
                stream_id: stream_id,
                callback: callback
            });
        } else {
            self.inSend++;
            try {
                self.bolt.receive(data, stream_id, (err) => {
                    self.telemetryAdd(Date.now() - ts_start);
                    callback(err);
                    if (err) { return; } // stop processing if there was an error
                    self.inSend--;
                    if (self.inSend === 0) {
                        if (self.pendingSendRequests.length > 0) {
                            let d = self.pendingSendRequests[0];
                            self.pendingSendRequests = self.pendingSendRequests.slice(1);
                            self.receive(d.data, d.stream_id, d.callback);
                        } else if (self.pendingShutdownCallback) {
                            let cb = self.pendingShutdownCallback;
                            self.pendingShutdownCallback = null;
                            cb();
                        }
                    }
                });
            } catch (e) {
                callback(e);
            }
        }
    }

    /** Factory method for sys bolts */
    static createSysBolt(bolt_config: any) {
        switch (bolt_config.cmd) {
            case "console": return new cb.ConsoleBolt();
            case "filter": return new fb.FilterBolt();
            case "attacher": return new ab.AttacherBolt();
            case "accumulator": return new ac.AccumulatorBolt();
            case "transform": return new tb.TransformBolt();
            case "post": return new pb.PostBolt();
            case "process": return new prb.ProcessBoltContinuous();
            case "get": return new gb.GetBolt();
            case "router": return new rb.RouterBolt();
            case "file_append_csv": return new fab.CsvFileAppendBolt();
            case "file_append": return new fab.FileAppendBolt();
            case "file_append_ex": return new fab2.FileAppendBoltEx();
            case "date_transform": return new ttb.TypeTransformBolt();
            case "type_transform": return new ttb.TypeTransformBolt();
            case "bomb": return new bb.BombBolt();
            case "counter": return new cntb.CounterBolt();
            default: throw new Error("Unknown sys bolt type: " + bolt_config.cmd);
        }
    }
}

export function createSysSpout(config) { return TopologySpoutWrapper.createSysSpout(config); }
export function createSysBolt(config) { return TopologyBoltWrapper.createSysBolt(config); }
