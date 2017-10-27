"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const path = require("path");
const fb = require("./std_nodes/filter_bolt");
const pb = require("./std_nodes/post_bolt");
const cb = require("./std_nodes/console_bolt");
const ab = require("./std_nodes/attacher_bolt");
const gb = require("./std_nodes/get_bolt");
const rb = require("./std_nodes/router_bolt");
const bb = require("./std_nodes/bomb_bolt");
const fab = require("./std_nodes/file_append_bolt");
const cntb = require("./std_nodes/counter_bolt");
const dtb = require("./std_nodes/date_transform_bolt");
const frs = require("./std_nodes/file_reader_spout");
const ps = require("./std_nodes/process_spout");
const rs = require("./std_nodes/rest_spout");
const ts = require("./std_nodes/timer_spout");
const gs = require("./std_nodes/get_spout");
const rss = require("./std_nodes/rss_spout");
const tss = require("./std_nodes/test_spout");
const ds = require("./std_nodes/dir_watcher_spout");
const tel = require("./util/telemetry");
const log = require("./util/logger");
/** Base class for spouts and bolts - contains telemetry support */
class TopologyNodeBase {
    constructor(name, telemetry_timeout) {
        this.name = name;
        this.telemetry = new tel.Telemetry(name);
        this.telemetry_total = new tel.Telemetry(name);
        this.telemetry_next_emit = Date.now();
        this.telemetry_timeout = telemetry_timeout || 60 * 1000;
    }
    /** This method checks if telemetry data should be emitted
     * and calls provided callback if that is the case.
     */
    telemetryHeartbeat(emitCallback) {
        let now = Date.now();
        if (now >= this.telemetry_next_emit) {
            let msg = {
                name: this.name,
                ts: Date.now(),
                total: this.telemetry_total.get(),
                last: this.telemetry.get()
            };
            emitCallback(msg, "$telemetry");
            this.telemetry.reset();
            this.telemetry_next_emit = now + this.telemetry_timeout;
        }
    }
    /** Adds duration to internal telemetry */
    telemetryAdd(duration) {
        this.telemetry.add(duration);
        this.telemetry_total.add(duration);
    }
    /** helper function that sets isError flag when a callback is called with an error */
    wrapCallbackSetError(callback) {
        let self = this;
        return (err) => {
            if (err) {
                self.isError = true;
            }
            callback(err);
        };
    }
}
exports.TopologyNodeBase = TopologyNodeBase;
/** Wrapper for spout */
class TopologySpoutWrapper extends TopologyNodeBase {
    /** Constructor needs to receive all data */
    constructor(config, context) {
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
            }
            else {
                this.working_dir = path.resolve(this.working_dir); // path may be relative to current working dir
                let module_path = path.join(this.working_dir, this.cmd);
                this.child = require(module_path).create(this.subtype);
            }
        }
        catch (e) {
            log.logger().error("Error while creating an inproc spout");
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
    /** Returns name of this node */
    getName() {
        return this.name;
    }
    /** Returns inner spout object */
    getSpoutObject() {
        return this.child;
    }
    /** Handler for heartbeat signal */
    heartbeat() {
        let self = this;
        if (self.isError)
            return;
        if (self.isPaused)
            return;
        try {
            self.child.heartbeat();
        }
        catch (e) {
            log.logger().error("Error in spout heartbeat");
            log.logger().exception(e);
            self.errorCallback(e);
            return;
        }
        self.telemetryHeartbeat((msg, stream_id) => {
            self.emitCallback(msg, stream_id, () => { });
        });
    }
    /** Shuts down the process */
    shutdown(callback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError)
            return callback();
        // without an exception the caller will think that everything shut down nicely already when we call shutdown twice by mistake
        if (this.isShuttingDown)
            return callback(new Error("Spout is already shutting down."));
        this.isShuttingDown = true;
        try {
            this.child.shutdown(callback);
        }
        catch (e) {
            log.logger().error("Unhandled error in spout shutdown");
            log.logger().exception(e);
            callback(e);
        }
    }
    /** Initializes child object. */
    init(callback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        try {
            this.child.init(this.name, this.init_params, this.context, callback);
        }
        catch (e) {
            log.logger().error("Unhandled error in spout init");
            log.logger().exception(e);
            callback(e);
        }
    }
    /** Sends run signal and starts the "pump" */
    run() {
        let self = this;
        if (!this.isPaused)
            return; // already running
        this.isPaused = false;
        try {
            this.child.run();
        }
        catch (e) {
            log.logger().error("Error in spout run");
            log.logger().exception(e);
            self.errorCallback(e);
            return;
        }
        async.whilst(() => { return !self.isPaused && !self.isError; }, (xcallback) => {
            if (Date.now() < this.nextTs) {
                let sleep = this.nextTs - Date.now();
                setTimeout(() => { xcallback(); }, sleep);
            }
            else {
                self.next(xcallback);
            }
        }, (err) => {
            if (err) {
                log.logger().error("Error in spout next");
                log.logger().exception(err);
                self.errorCallback(err);
            }
        });
    }
    /** Requests next data message */
    next(callback) {
        let self = this;
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (self.isPaused || self.isError) {
            return callback();
        }
        else {
            let ts_start = Date.now();
            setImmediate(() => {
                try {
                    this.child.next((err, data, stream_id, xcallback) => {
                        self.telemetryAdd(Date.now() - ts_start);
                        if (err) {
                            // child sent an error, xcallback is ignored
                            log.logger().exception(err);
                            return callback(err);
                        }
                        if (!data) {
                            // child didn't send any data, so xcallback is ignored
                            self.nextTs = Date.now() + 1 * 1000; // sleep for 1 sec if spout is empty
                            return callback();
                        }
                        else {
                            try {
                                self.emitCallback(data, stream_id, (err) => {
                                    // in case child object expects confirmation call for this tuple
                                    if (xcallback && !err) {
                                        xcallback(null, callback);
                                    }
                                    else {
                                        callback(err);
                                    }
                                });
                            }
                            catch (e) {
                                // there was an error, don't call the child's xcallback
                                callback(e);
                            }
                        }
                    });
                }
                catch (e) {
                    callback(e);
                }
            });
        }
    }
    /** Sends pause signal to child */
    pause() {
        if (this.isPaused)
            return; // already paused
        this.isPaused = true;
        try {
            this.child.pause();
        }
        catch (e) {
            log.logger().error("Error in spout pause");
            log.logger().exception(e);
            this.errorCallback(e);
        }
    }
    /** Factory method for sys spouts */
    createSysSpout(spout_config) {
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
exports.TopologySpoutWrapper = TopologySpoutWrapper;
/** Wrapper for bolt */
class TopologyBoltWrapper extends TopologyNodeBase {
    /** Constructor needs to receive all data */
    constructor(config, context) {
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
        self.errorCallback = self.wrapCallbackSetError(self.errorCallback);
        this.allow_parallel = config.allow_parallel || false;
        this.isShuttingDown = false;
        this.inSend = 0;
        this.pendingSendRequests = [];
        this.pendingShutdownCallback = null;
        try {
            if (config.type == "sys") {
                this.child = this.createSysBolt(config);
            }
            else {
                this.working_dir = path.resolve(this.working_dir); // path may be relative to current working dir
                let module_path = path.join(this.working_dir, this.cmd);
                this.child = require(module_path).create(this.subtype);
            }
        }
        catch (e) {
            log.logger().error("Error while creating an inproc bolt");
            log.logger().exception(e);
            throw e;
        }
    }
    /** Returns name of this node */
    getName() {
        return this.name;
    }
    /** Returns inner bolt object */
    getBoltObject() {
        return this.child;
    }
    /** Handler for heartbeat signal */
    heartbeat() {
        let self = this;
        if (self.isError)
            return;
        try {
            self.child.heartbeat();
        }
        catch (e) {
            log.logger().error("Error in bolt heartbeat");
            log.logger().exception(e);
            self.errorCallback(e);
            return;
        }
        self.telemetryHeartbeat((msg, stream_id) => {
            self.emitCallback(msg, stream_id, () => { });
        });
    }
    /** Shuts down the child */
    shutdown(callback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        if (this.isError)
            return callback();
        // without an exception the caller will think that everything shut down nicely already when we call shutdown twice by mistake
        if (this.isShuttingDown)
            return callback(new Error("Bolt is already shutting down."));
        this.isShuttingDown = true;
        try {
            if (this.inSend === 0) {
                return this.child.shutdown(callback);
            }
            else {
                this.pendingShutdownCallback = callback;
            }
        }
        catch (e) {
            callback(e);
        }
    }
    /** Initializes child object. */
    init(callback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        try {
            this.child.init(this.name, this.init_params, this.context, callback);
        }
        catch (e) {
            log.logger().error("Error in bolt init");
            log.logger().exception(e);
            callback(e);
        }
    }
    /** Sends data to child object. */
    receive(data, stream_id, callback) {
        // wrap callback to set self.isError when an exception passed
        callback = this.wrapCallbackSetError(callback);
        let self = this;
        if (self.isError)
            return callback(new Error(`Bolt ${self.name} has error flag set.`));
        let ts_start = Date.now();
        if (self.inSend > 0 && !self.allow_parallel) {
            self.pendingSendRequests.push({
                data: data,
                stream_id: stream_id,
                callback: callback
            });
        }
        else {
            self.inSend++;
            try {
                self.child.receive(data, stream_id, (err) => {
                    self.telemetryAdd(Date.now() - ts_start);
                    callback(err);
                    if (err) {
                        return;
                    } // stop processing if there was an error
                    self.inSend--;
                    if (self.inSend === 0) {
                        if (self.pendingSendRequests.length > 0) {
                            let d = self.pendingSendRequests[0];
                            self.pendingSendRequests = self.pendingSendRequests.slice(1);
                            self.receive(d.data, d.stream_id, d.callback);
                        }
                        else if (self.pendingShutdownCallback) {
                            self.shutdown(self.pendingShutdownCallback);
                            self.pendingShutdownCallback = null;
                        }
                    }
                });
            }
            catch (e) {
                callback(e);
            }
        }
    }
    /** Factory method for sys bolts */
    createSysBolt(bolt_config) {
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
exports.TopologyBoltWrapper = TopologyBoltWrapper;
//# sourceMappingURL=topology_local_inprocess.js.map