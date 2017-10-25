import * as intf from "./topology_interfaces";

import * as async from "async";
import * as path from "path";
import * as cp from "child_process";

import * as fb from "./std_nodes/filter_bolt";
import * as pb from "./std_nodes/post_bolt";
import * as cb from "./std_nodes/console_bolt";
import * as ab from "./std_nodes/attacher_bolt";
import * as gb from "./std_nodes/get_bolt";
import * as rb from "./std_nodes/router_bolt";
import * as bb from "./std_nodes/bomb_bolt";
import * as fab from "./std_nodes/file_append_bolt";
import * as cntb from "./std_nodes/counter_bolt";
import * as dtb from "./std_nodes/date_transform_bolt";

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

/** Base class for spouts and bolts - contains telemetry support */
export class TopologyNodeBase {

    protected name: string;
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
}


/** Wrapper for spout */
export class TopologySpoutWrapper extends TopologyNodeBase {

    private context: any;
    private working_dir: string;
    private cmd: string;
    private subtype: string;
    private init_params: any;
    private isPaused: boolean;
    private isError: boolean;
    private nextTs: number;

    private child: intf.Spout;
    private emitCallback: intf.BoltEmitCallback;
    private errorCallback: intf.SimpleCallback;

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
                this.child = this.createSysSpout(config);
            } else {
                this.working_dir = path.resolve(this.working_dir); // path may be relative to current working dir
                let module_path = path.join(this.working_dir, this.cmd);
                this.child = require(module_path).create(this.subtype);
            }
        } catch (e) {
            log.logger().error("Error while creating an inproc spout");
            log.logger().exception(e);
            throw e;
        }

        self.emitCallback = (data, stream_id, callback) => {
            config.onEmit(data, stream_id, callback);
        };
        self.errorCallback = config.onError || (() => { });
        self.isPaused = true;
        self.nextTs = Date.now();
    }

    /** Returns name of this node */
    getName(): string {
        return this.name;
    }

    /** Returns inner spout object */
    getSpoutObject(): intf.Spout {
        return this.child;
    }

    /** Handler for heartbeat signal */
    heartbeat() {
        let self = this;
        if (self.isError) return;
        try {
            self.child.heartbeat();
        } catch (e) {
            log.logger().error("Error in spout heartbeat");
            log.logger().exception(e);
            self.isError = true;
            self.errorCallback(e);
            return;
        }
        self.telemetryHeartbeat((msg, stream_id) => {
            self.emitCallback(msg, stream_id, () => { });
        });
    }

    /** Shuts down the process */
    shutdown(callback: intf.SimpleCallback) {
        if (this.isError) return;
        try {
            this.child.shutdown(callback);
            // wrap callback to set self.isError when an exception passed?
        } catch (e) {
            // threw an exception before passing control
            log.logger().error("Unhandled error in spout shutdown");
            log.logger().exception(e);
            this.isError = true;
            callback(e);
        }
    }

    /** Initializes child object. */
    init(callback: intf.SimpleCallback) {
        try {
            this.child.init(this.name, this.init_params, this.context, callback);
        } catch (e) {
            // threw an exception before passing control
            log.logger().error("Unhandled error in spout init");
            log.logger().exception(e);
            this.isError = true;
            this.errorCallback(e);
        }
    }

    /** Sends run signal and starts the "pump" */
    run() {
        let self = this;
        this.isPaused = false;
        try {
            this.child.run();
        } catch (e) {
            log.logger().error("Error in spout run");
            log.logger().exception(e);
            // set isError and do not run the pump?
        }
        async.whilst(
            // also check isError?
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
                    log.logger().error("Error in spout next");
                    log.logger().exception(err);
                    self.isError = true;
                    self.errorCallback(err);
                }
            });
    }

    /** Requests next data message */
    private next(callback: intf.SimpleCallback) {
        let self = this;
        // check isError?
        if (self.isPaused || self.isError) {
            callback();
        } else {
            let ts_start = Date.now();
            setImmediate(() => {
                try {
                    this.child.next((err, data, stream_id, xcallback) => {
                        self.telemetryAdd(Date.now() - ts_start);
                        if (err) {
                            log.logger().exception(err);
                            return callback(err);
                        }
                        if (!data) {
                            self.nextTs = Date.now() + 1 * 1000; // sleep for 1 sec if spout is empty
                            callback();
                        } else {
                            try {
                                self.emitCallback(data, stream_id, (err) => {
                                    // in case child object expects confirmation call for this tuple
                                    if (xcallback) {
                                        xcallback(err, callback);
                                    } else {
                                        callback();
                                    }
                                });
                            } catch (e) {
                                callback(e);
                            }
                        }
                    });
                } catch (e) {
                    callback(e);
                }
            });
        }
    }

    /** Sends pause signal to child */
    pause() {
        this.isPaused = true;
        try {
            this.child.pause();
        } catch (e) {
            log.logger().error("Error in spout pause");
            log.logger().exception(e);
            this.isError = true;
            this.errorCallback(e);
        }
    }

    /** Factory method for sys spouts */
    private createSysSpout(spout_config: any): intf.Spout {
        switch (spout_config.cmd) {
            case "timer": return new ts.TimerSpout();
            case "get": return new gs.GetSpout();
            case "rest": return new rs.RestSpout();
            case "dir": return new ds.DirWatcherSpout();
            case "file_reader": return new frs.FileReaderSpout();
            case "process": return new ps.ProcessSpout();
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
    private isError: boolean;
    private nextTs: number;
    private allow_parallel: boolean;
    private inSend: number;
    private pendingSendRequests: any[];
    private pendingShutdownCallback: intf.SimpleCallback;

    private child: intf.Bolt;
    private emitCallback: intf.BoltEmitCallback;
    private errorCallback: intf.SimpleCallback;

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
            if (self.isShuttingDown) {
                return callback(new Error("Bolt is shutting down: " + self.name));
            }
            config.onEmit(data, stream_id, callback);
        };
        this.emitCallback = this.init_params.onEmit;
        this.errorCallback = config.onError || (() => { });
        this.allow_parallel = config.allow_parallel || false;

        this.isShuttingDown = false;

        this.inSend = 0;
        this.pendingSendRequests = [];
        this.pendingShutdownCallback = null;

        try {
            if (config.type == "sys") {
                this.child = this.createSysBolt(config);
            } else {
                this.working_dir = path.resolve(this.working_dir); // path may be relative to current working dir
                let module_path = path.join(this.working_dir, this.cmd);
                this.child = require(module_path).create(this.subtype);
            }
        } catch (e) {
            log.logger().error("Error while creating an inproc bolt");
            log.logger().exception(e);
            throw e;
        }
    }

    /** Returns name of this node */
    getName(): string {
        return this.name;
    }

    /** Returns inner bolt object */
    getBoltObject(): intf.Bolt {
        return this.child;
    }

    /** Handler for heartbeat signal */
    heartbeat() {
        let self = this;
        if (self.isError) return;
        try {
            self.child.heartbeat();
        } catch (e) {
            log.logger().error("Error in bolt heartbeat");
            log.logger().exception(e);
            self.isError = true;
            self.errorCallback(e);
            return;
        }
        self.telemetryHeartbeat((msg, stream_id) => {
            self.emitCallback(msg, stream_id, () => { });
        });
    }

    /** Shuts down the child */
    shutdown(callback: intf.SimpleCallback) {
        if (this.isError) return callback();
        try {
            this.isShuttingDown = true;
            if (this.inSend === 0) {
                return this.child.shutdown(callback);
            } else {
                this.pendingShutdownCallback = callback;
            }
        } catch (e) {
            callback(e);
        }
    }

    /** Initializes child object. */
    init(callback: intf.SimpleCallback) {
        try {
            this.child.init(this.name, this.init_params, this.context, callback);
        } catch (e) {
            log.logger().error("Error in bolt init");
            log.logger().exception(e);
            this.isError = true;
            this.errorCallback(e);
        }
    }

    /** Sends data to child object. */
    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        let self = this;
        if (self.isError) return callback(new Error(`Bolt ${self.name} has error flag set.`));
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
                self.child.receive(data, stream_id, (err) => {
                    self.telemetryAdd(Date.now() - ts_start);
                    callback(err);
                    if (err) return; // stop processing if there was an error
                    self.inSend--;
                    if (self.inSend === 0) {
                        if (self.pendingSendRequests.length > 0) {
                            let d = self.pendingSendRequests[0];
                            self.pendingSendRequests = self.pendingSendRequests.slice(1);
                            self.receive(d.data, d.stream_id, d.callback);
                        } else if (self.pendingShutdownCallback) {
                            self.shutdown(self.pendingShutdownCallback);
                            self.pendingShutdownCallback = null;
                        }
                    }
                });
            } catch (e) {
                callback(e);
            }
        }
    }

    /** Factory method for sys bolts */
    private createSysBolt(bolt_config: any) {
        switch (bolt_config.cmd) {
            case "console": return new cb.ConsoleBolt();
            case "filter": return new fb.FilterBolt();
            case "attacher": return new ab.AttacherBolt();
            case "post": return new pb.PostBolt();
            case "get": return new gb.GetBolt();
            case "router": return new rb.RouterBolt();
            case "file_append": return new fab.FileAppendBolt();
            case "date_transform": return new dtb.DateTransformBolt();
            case "bomb": return new bb.BombBolt();
            case "counter": return new cntb.CounterBolt();
            default: throw new Error("Unknown sys bolt type: " + bolt_config.cmd);
        }
    }
}
