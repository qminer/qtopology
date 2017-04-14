"use strict";
var async = require("async");
var path = require("path");
var cp = require("child_process");
var EventEmitter = require("events");
var fb = require("./std_nodes/filter_bolt");
var pb = require("./std_nodes/post_bolt");
var cb = require("./std_nodes/console_bolt");
var ab = require("./std_nodes/attacher_bolt");
var gb = require("./std_nodes/get_bolt");
var rb = require("./std_nodes/router_bolt");
var rs = require("./std_nodes/rest_spout");
var ts = require("./std_nodes/timer_spout");
var gs = require("./std_nodes/get_spout");
var tss = require("./std_nodes/test_spout");
var tel = require("./util/telemetry");
////////////////////////////////////////////////////////////////////
/** Wrapper for "spout" in-process */
var TopologySpoutInproc = (function () {
    /** Constructor needs to receive all data */
    function TopologySpoutInproc(config, context) {
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
        var self = this;
        try {
            if (config.type == "sys") {
                this._child = this._createSysSpout(config, context);
            }
            else {
                this._working_dir = path.resolve(this._working_dir); // path may be relative to current working dir
                var module_path = path.join(this._working_dir, this._cmd);
                this._child = require(module_path).create(context);
            }
            this._isStarted = true;
        }
        catch (e) {
            console.error("Error while creating an inproc spout", e);
            this._isStarted = true;
            this._isClosed = true;
            this._isExit = true;
            this._isError = true;
        }
        self._emitCallback = function (data, stream_id, callback) {
            config.onEmit(data, stream_id, callback);
        };
        self._isPaused = true;
        self._nextTs = Date.now();
    }
    /** Returns name of this node */
    TopologySpoutInproc.prototype.getName = function () {
        return this._name;
    };
    /** Handler for heartbeat signal */
    TopologySpoutInproc.prototype.heartbeat = function () {
        var self = this;
        self._child.heartbeat();
        // emit telemetry
        self._emitCallback(self._telemetry.get(), "$telemetry", function () { });
        self._telemetry.reset();
        self._emitCallback(self._telemetry_total.get(), "$telemetry-total", function () { });
    };
    /** Shuts down the process */
    TopologySpoutInproc.prototype.shutdown = function (callback) {
        this._child.shutdown(callback);
    };
    /** Initializes child object. */
    TopologySpoutInproc.prototype.init = function (callback) {
        this._child.init(this._name, this._init, callback);
    };
    /** Sends run signal and starts the "pump"" */
    TopologySpoutInproc.prototype.run = function () {
        var _this = this;
        var self = this;
        this._isPaused = false;
        this._child.run();
        async.whilst(function () { return !self._isPaused; }, function (xcallback) {
            if (Date.now() < _this._nextTs) {
                var sleep = _this._nextTs - Date.now();
                setTimeout(function () { xcallback(); }, sleep);
            }
            else {
                self._next(xcallback);
            }
        }, function () { });
    };
    /** Requests next data message */
    TopologySpoutInproc.prototype._next = function (callback) {
        var self = this;
        if (this._isPaused) {
            callback();
        }
        else {
            var ts_start_1 = Date.now();
            this._child.next(function (err, data, stream_id, xcallback) {
                self._telemetryAdd(Date.now() - ts_start_1);
                if (err) {
                    console.error(err);
                    callback();
                    return;
                }
                if (!data) {
                    self._nextTs = Date.now() + 1 * 1000; // sleep for 1 sec if spout is empty
                    callback();
                }
                else {
                    self._emitCallback(data, stream_id, function (err) {
                        // in case child object expects confirmation call for this tuple
                        if (xcallback) {
                            xcallback(err, callback);
                        }
                        else {
                            callback();
                        }
                    });
                }
            });
        }
    };
    /** Sends pause signal to child */
    TopologySpoutInproc.prototype.pause = function () {
        this._isPaused = true;
        this._child.pause();
    };
    /** Factory method for sys spouts */
    TopologySpoutInproc.prototype._createSysSpout = function (spout_config, context) {
        switch (spout_config.cmd) {
            case "timer": return new ts.TimerSpout(context);
            case "get": return new gs.GetSpout(context);
            case "rest": return new rs.RestSpout(context);
            case "test": return new tss.TestSpout(context);
            default: throw new Error("Unknown sys spout type:", spout_config.cmd);
        }
    };
    /** Adds duration to internal telemetry */
    TopologySpoutInproc.prototype._telemetryAdd = function (duration) {
        this._telemetry.add(duration);
        this._telemetry_total.add(duration);
    };
    return TopologySpoutInproc;
}());
/** Wrapper for "bolt" in-process */
var TopologyBoltInproc = (function () {
    /** Constructor needs to receive all data */
    function TopologyBoltInproc(config, context) {
        var self = this;
        this._name = config.name;
        this._context = context;
        this._working_dir = config.working_dir;
        this._cmd = config.cmd;
        this._init = config.init || {};
        this._init.onEmit = function (data, stream_id, callback) {
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
            }
            else {
                this._working_dir = path.resolve(this._working_dir); // path may be relative to current working dir
                var module_path = path.join(this._working_dir, this._cmd);
                this._child = require(module_path).create(context);
            }
            this._isStarted = true;
        }
        catch (e) {
            console.error("Error while creating an inproc bolt", e);
            this._isStarted = true;
            this._isClosed = true;
            this._isExit = true;
            this._isError = true;
        }
    }
    /** Returns name of this node */
    TopologyBoltInproc.prototype.getName = function () {
        return this._name;
    };
    /** Handler for heartbeat signal */
    TopologyBoltInproc.prototype.heartbeat = function () {
        var self = this;
        self._child.heartbeat();
        // emit telemetry
        self._emitCallback(self._telemetry.get(), "$telemetry", function () { });
        self._telemetry.reset();
        self._emitCallback(self._telemetry_total.get(), "$telemetry-total", function () { });
    };
    /** Shuts down the child */
    TopologyBoltInproc.prototype.shutdown = function (callback) {
        this._isShuttingDown = true;
        if (this._inSend === 0) {
            return this._child.shutdown(callback);
        }
        else {
            this._pendingShutdownCallback = callback;
        }
    };
    /** Initializes child object. */
    TopologyBoltInproc.prototype.init = function (callback) {
        this._child.init(this._name, this._init, callback);
    };
    /** Sends data to child object. */
    TopologyBoltInproc.prototype.receive = function (data, stream_id, callback) {
        var self = this;
        var ts_start = Date.now();
        if (self._inSend > 0 && !self._allow_parallel) {
            self._pendingSendRequests.push({
                data: data,
                stream_id: stream_id,
                callback: function (err) {
                    self._telemetryAdd(Date.now() - ts_start);
                    callback(err);
                }
            });
        }
        else {
            self._inSend++;
            self._child.receive(data, stream_id, function (err) {
                callback(err);
                self._inSend--;
                if (self._inSend === 0) {
                    if (self._pendingSendRequests.length > 0) {
                        var d = self._pendingSendRequests[0];
                        self._pendingSendRequests = self._pendingSendRequests.slice(1);
                        self.receive(d.data, stream_id, d.callback);
                    }
                    else if (self._pendingShutdownCallback) {
                        self.shutdown(self._pendingShutdownCallback);
                        self._pendingShutdownCallback = null;
                    }
                }
            });
        }
    };
    /** Factory method for sys bolts */
    TopologyBoltInproc.prototype._createSysBolt = function (bolt_config, context) {
        switch (bolt_config.cmd) {
            case "console": return new cb.ConsoleBolt(context);
            case "filter": return new fb.FilterBolt(context);
            case "attacher": return new ab.AttacherBolt(context);
            case "post": return new pb.PostBolt(context);
            case "get": return new gb.GetBolt(context);
            case "router": return new rb.RouterBolt(context);
            default: throw new Error("Unknown sys bolt type:", bolt_config.cmd);
        }
    };
    /** Adds duration to internal telemetry */
    TopologyBoltInproc.prototype._telemetryAdd = function (duration) {
        this._telemetry.add(duration);
        this._telemetry_total.add(duration);
    };
    return TopologyBoltInproc;
}());
////////////////////////////////////////////////////////////////////////////////////
exports.TopologyBoltInproc = TopologyBoltInproc;
exports.TopologySpoutInproc = TopologySpoutInproc;
