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
import { SpoutAsyncWrapper, BoltAsyncWrapper } from "./topology_async_wrappers";
import { ForwardrBolt as ForwardBolt } from "./std_nodes/forward_bolt";

const NEXT_SLEEP_TIMEOUT: number = 1 * 1000; // number of miliseconds to "sleep" when spout.next() returned no data

/** Base class for spouts and bolts - contains telemetry support */
export class TopologyNodeBase {

    protected name: string;
    protected isError: boolean;
    protected firstErrorMessage: string;
    protected errorCallback: intf.SimpleCallback; // used for functions without callbacks

    private telemetry_next_emit: number;
    private telemetry_timeout: number;
    private telemetry: tel.Telemetry;
    private telemetry_total: tel.Telemetry;

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
    public telemetryHeartbeat(emitCallback: (msg: any, stream_id: string) => void) {
        const now = Date.now();
        if (now >= this.telemetry_next_emit) {
            const msg = {
                last: this.telemetry.get(),
                name: this.name,
                total: this.telemetry_total.get(),
                ts: Date.now()
            };
            emitCallback(msg, "$telemetry");
            this.telemetry.reset();
            this.telemetry_next_emit = now + this.telemetry_timeout;
        }
    }

    /** Adds duration to internal telemetry */
    public telemetryAdd(duration: number) {
        this.telemetry.add(duration);
        this.telemetry_total.add(duration);
    }

    /** helper function that sets isError flag when a callback is called with an error */
    protected wrapCallbackSetError(callback: intf.SimpleCallback): intf.SimpleCallback {
        return (err?: Error) => {
            if (err) {
                this.isError = true;
                if (this.firstErrorMessage == "") {
                    this.firstErrorMessage = err.message;
                }
                log.logger().error("Internal error in " + this.name + ". Setting error flag.");
                log.logger().exception(err);
            }
            try {
                callback(err);
            } catch (e) {
                log.logger().error("THIS SHOULD NOT HAPPEN: exception THROWN in callback!");
                log.logger().exception(e);
            }
        };
    }
}

/** Wrapper for spout */
export class TopologySpoutWrapper extends TopologyNodeBase {

    /** Factory method for sys spouts */
    public static createSysSpout(spout_config: any) {
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

    private context: any;
    private working_dir: string;
    private cmd: string;
    private subtype: string;
    private init_params: any;
    private isPaused: boolean;
    private isShuttingDown: boolean;
    private initCalled: boolean;
    private nextTs: number;

    private spout: intf.ISpout;
    private emitCallback: intf.BoltEmitCallback;

    /** Constructor needs to receive all data */
    constructor(config: any, context: any) {
        super(config.name, config.telemetry_timeout);

        this.name = config.name;
        this.context = context;
        this.working_dir = config.working_dir;
        this.cmd = config.cmd;
        this.subtype = config.subtype;
        this.init_params = config.init || {};
        this.isError = false;

        try {
            if (config.type == "sys") {
                this.spout = createSysSpout(config);
            } else if (config.type == "module_class") {
                this.makeWorkingDirAbsolute();
                const module = require(this.working_dir);
                const obj = new module[this.cmd](this.subtype);
                if (!obj) {
                    throw new Error(
                        `Spout factory returned null: ${this.working_dir}, cmd=${this.cmd}, subtype=${this.subtype}`);
                }
                if (obj.init.length < 4) {
                    this.spout = new SpoutAsyncWrapper(obj);
                } else {
                    this.spout = obj;
                }
            } else if (config.type == "module_method") {
                this.makeWorkingDirAbsolute();
                const module = require(this.working_dir);
                const obj = module[this.cmd](this.subtype);
                if (!obj) {
                    throw new Error(
                        `Spout factory returned null: ${this.working_dir}, cmd=${this.cmd}, subtype=${this.subtype}`);
                }
                if (obj.init.length < 4) {
                    this.spout = new SpoutAsyncWrapper(obj);
                } else {
                    this.spout = obj;
                }
            } else {
                this.working_dir = path.resolve(this.working_dir); // path may be relative to current working dir
                const module_path = path.join(this.working_dir, this.cmd);
                const obj = require(module_path).create(this.subtype);
                if (!obj) {
                    throw new Error(`Spout factory returned null: ${module_path}, subtype=${this.subtype}`);
                }
                if (obj.init.length < 4) {
                    this.spout = new SpoutAsyncWrapper(obj);
                } else {
                    this.spout = obj;
                }
            }
        } catch (e) {
            log.logger().error(`Error while creating an inproc spout (${this.name})`);
            log.logger().exception(e);
            throw e;
        }

        this.emitCallback = (data, stream_id, callback) => {
            config.onEmit(data, stream_id, callback);
        };
        this.errorCallback = config.onError || (() => {
            // no-op
        });
        this.errorCallback = this.wrapCallbackSetError(this.errorCallback);
        this.isPaused = true;
        this.isShuttingDown = false;
        this.nextTs = Date.now();
    }

    /** Returns name of this node */
    public getName(): string {
        return this.name;
    }

    /** Returns inner spout object */
    public getSpoutObject(): intf.ISpout {
        return this.spout;
    }

    /** Handler for heartbeat signal */
    public heartbeat() {
        if (this.isError) {
            return;
        }
        if (this.isPaused) {
            return;
        }
        try {
            this.spout.heartbeat();
        } catch (e) {
            log.logger().error(`Error in spout (${this.name}) heartbeat`);
            log.logger().exception(e);
            return this.errorCallback(e);
        }
        this.telemetryHeartbeat((msg, stream_id) => {
            this.emitCallback(msg, stream_id, () => {
                // no-op
            });
        });
    }

    /** Shuts down the process */
    public shutdown(callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError) {
            return callback(new Error(`Spout (${this.name}) has error flag set. ` +
                `Shutdown refused. Last error: ${this.firstErrorMessage}`));
        }
        // without an exception the caller will think that everything shut down nicely already
        // when we call shutdown twice by mistake
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
    public init(callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError) {
            return callback(new Error(`Spout (${this.name}) has error flag set. ` +
                `Init refused. Last error: ${this.firstErrorMessage}`));
        }
        if (this.initCalled) {
            return callback(new Error(`Init already called in spout (${this.name})`));
        }
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
    public run() {
        if (!this.isPaused) {
            return; // already running
        }
        this.isPaused = false;
        try {
            this.spout.run();
        } catch (e) {
            log.logger().error(`Error in spout (${this.name}) run`);
            log.logger().exception(e);
            this.errorCallback(e);
            return;
        }
        async.whilst(
            () => !this.isPaused && !this.isError,
            xcallback => {
                if (Date.now() < this.nextTs) {
                    const sleep = this.nextTs - Date.now();
                    setTimeout(() => { xcallback(); }, sleep);
                } else {
                    this.next(xcallback);
                }
            },
            (err: Error) => {
                if (err) {
                    log.logger().error(`Error in spout (${this.name}) next`);
                    log.logger().exception(err);
                    this.errorCallback(err);
                }
            });
    }

    /** Sends pause signal to child */
    public pause() {
        if (this.isPaused) {
            return; // already paused
        }
        this.isPaused = true;
        try {
            this.spout.pause();
        } catch (e) {
            log.logger().error(`Error in spout (${this.name}) pause`);
            log.logger().exception(e);
            this.errorCallback(e);
        }
    }

    /** Requests next data message */
    private next(callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isPaused || this.isError) {
            // run will stop calling next when isError is true
            return callback();
        } else {
            const ts_start = Date.now();
            setImmediate(() => {
                try {
                    this.spout.next((err, data, stream_id) => {
                        this.telemetryAdd(Date.now() - ts_start);
                        if (err) {
                            log.logger().exception(err);
                            return callback(err);
                        }
                        if (!data) {
                            this.nextTs = Date.now() + NEXT_SLEEP_TIMEOUT;
                            return callback();
                        } else {
                            try {
                                this.emitCallback(data, stream_id, callback);
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

    /** Utility function for making working dir absolute - used to avoid some problematic situations */
    private makeWorkingDirAbsolute() {
        if (!path.isAbsolute(this.working_dir)) {
            this.working_dir = path.resolve(this.working_dir);
        }
    }
}

/** Wrapper for bolt */
export class TopologyBoltWrapper extends TopologyNodeBase {

    /** Factory method for sys bolts */
    public static createSysBolt(bolt_config: any) {
        switch (bolt_config.cmd) {
            case "console": return new cb.ConsoleBolt();
            case "filter": return new fb.FilterBolt();
            case "forward": return new ForwardBolt();
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
            case "date2numeric_transform": return new ttb.DateToNumericTransformBolt();
            case "bomb": return new bb.BombBolt();
            case "counter": return new cntb.CounterBolt();
            default: throw new Error("Unknown sys bolt type: " + bolt_config.cmd);
        }
    }

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

    private bolt: intf.IBolt; // TODO rename child to bolt
    private emitCallback: intf.BoltEmitCallback;

    /** Constructor needs to receive all data */
    constructor(config: any, context: any) {
        super(config.name, config.telemetry_timeout);
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
        this.errorCallback = config.onError || (() => {
            // no-op
        });
        this.errorCallback = this.wrapCallbackSetError(this.errorCallback);
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
                const module = require(this.working_dir);
                const obj = new module[this.cmd](this.subtype);
                if (!obj) {
                    throw new Error(
                        `Bolt factory returned null: ${this.working_dir}, cmd=${this.cmd}, subtype=${this.subtype}`);
                }
                if (obj.init.length < 4) {
                    this.bolt = new BoltAsyncWrapper(obj);
                } else {
                    this.bolt = obj;
                }
            } else if (config.type == "module_method") {
                this.makeWorkingDirAbsolute();
                const module = require(this.working_dir);
                const obj = module[this.cmd](this.subtype);
                if (!obj) {
                    throw new Error(
                        `Bolt factory returned null: ${this.working_dir}, cmd=${this.cmd}, subtype=${this.subtype}`);
                }
                if (obj.init.length < 4) {
                    this.bolt = new BoltAsyncWrapper(obj);
                } else {
                    this.bolt = obj;
                }
            } else {
                this.working_dir = path.resolve(this.working_dir); // path may be relative to current working dir
                const module_path = path.join(this.working_dir, this.cmd);
                const obj = require(module_path).create(this.subtype);
                if (!obj) {
                    throw new Error(`Bolt factory returned null: ${module_path}, subtype=${this.subtype}`);
                }
                if (obj.init.length < 4) {
                    this.bolt = new BoltAsyncWrapper(obj);
                } else {
                    this.bolt = obj;
                }
            }
        } catch (e) {
            log.logger().error(`Error while creating an inproc bolt (${this.name})`);
            log.logger().exception(e);
            throw e;
        }
    }

    /** Returns name of this node */
    public getName(): string {
        return this.name;
    }

    /** Returns inner bolt object */
    public getBoltObject(): intf.IBolt {
        return this.bolt;
    }

    /** Handler for heartbeat signal */
    public heartbeat() {
        const self = this;
        if (self.isError) {
            return;
        }
        try {
            self.bolt.heartbeat();
        } catch (e) {
            log.logger().error(`Error in bolt (${this.name}) heartbeat`);
            log.logger().exception(e);
            self.errorCallback(e);
            return;
        }
        self.telemetryHeartbeat((msg, stream_id) => {
            self.emitCallback(msg, stream_id, () => {
                // no-op
            });
        });
    }

    /** Shuts down the child */
    public shutdown(callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError) {
            return callback(new Error(
                `Bolt (${this.name}) has error flag set. ` +
                `Shutdown refused. Last error: ${this.firstErrorMessage}`));
        }
        // without an exception the caller will think that everything shut down nicely already
        // when we call shutdown twice by mistake
        if (this.isShuttingDown) {
            return callback(new Error(`Bolt (${this.name}) is already shutting down.`));
        }
        this.isShuttingDown = true;
        try {
            if (this.inSend === 0) {
                return this.bolt.shutdown(callback);
            } else {
                const cb2 = () => { this.bolt.shutdown(callback); };
                this.pendingShutdownCallback = cb2;
            }
        } catch (e) {
            callback(e);
        }
    }

    /** Initializes child object. */
    public init(callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError) {
            return callback(new Error(
                `Bolt (${this.name}) has error flag set. ` +
                `Init refused. Last error: ${this.firstErrorMessage}`));
        }
        if (this.initCalled) {
            return callback(new Error(`Bolt (${this.name}) init already called.`));
        }
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
    public receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        const self = this;
        if (self.isError) {
            return callback(new Error(`Bolt ${self.name} has error flag set. Last error: ${this.firstErrorMessage}`));
        }
        const ts_start = Date.now();
        if (self.inSend > 0 && !self.allow_parallel) {
            self.pendingSendRequests.push({ callback, data, stream_id });
        } else {
            self.inSend++;
            try {
                self.bolt.receive(data, stream_id, err => {
                    self.telemetryAdd(Date.now() - ts_start);
                    callback(err);
                    if (err) { return; } // stop processing if there was an error
                    self.inSend--;
                    if (self.inSend === 0) {
                        if (self.pendingSendRequests.length > 0) {
                            const d = self.pendingSendRequests[0];
                            self.pendingSendRequests = self.pendingSendRequests.slice(1);
                            self.receive(d.data, d.stream_id, d.callback);
                        } else if (self.pendingShutdownCallback) {
                            const cb2 = self.pendingShutdownCallback;
                            self.pendingShutdownCallback = null;
                            cb2();
                        }
                    }
                });
            } catch (e) {
                callback(e);
            }
        }
    }

    /** Utility function for making working dir absolute - used to avoid some problematic situations */
    private makeWorkingDirAbsolute() {
        if (!path.isAbsolute(this.working_dir)) {
            this.working_dir = path.resolve(this.working_dir);
        }
    }
}

export function createSysSpout(config) {
    return TopologySpoutWrapper.createSysSpout(config);
}
export function createSysBolt(config) {
    return TopologyBoltWrapper.createSysBolt(config);
}
