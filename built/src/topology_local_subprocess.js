"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var async = require("async");
var cp = require("child_process");
var EventEmitter = require("events");
var tel = require("./util/telemetry");
////////////////////////////////////////////////////////////////////
/** Base class for communication with underlaying process */
var TopologyNode = (function (_super) {
    __extends(TopologyNode, _super);
    /** Constructor needs to receive basic data */
    function TopologyNode(config) {
        var _this = _super.call(this) || this;
        _this._name = config.name;
        _this._working_dir = config.working_dir;
        _this._cmd = config.cmd;
        _this._init = config.init || {};
        _this._init.name = config.name;
        _this._isStarted = false;
        _this._isShuttingDown = false;
        _this._isClosed = false;
        _this._isExit = false;
        _this._isError = false;
        _this._onExit = null;
        _this._pendingInitCallback = null;
        _this._telemetry = new tel.Telemetry(config.name);
        _this._telemetry_total = new tel.Telemetry(config.name);
        _this._telemetry_callback = null;
        try {
            _this._child = cp.fork(_this._cmd, [], { cwd: _this._working_dir });
            _this._isStarted = true;
        }
        catch (e) {
            _this._isStarted = true;
            _this._isClosed = true;
            _this._isExit = true;
            _this._isError = true;
        }
        return _this;
    }
    /** Returns name of this node */
    TopologyNode.prototype.getName = function () {
        return this._name;
    };
    /** Handler for heartbeat signal */
    TopologyNode.prototype.heartbeat = function () {
        var self = this;
        this._child.send({ cmd: "heartbeat" });
        // emit telemetry
        self._telemetry_callback(self._telemetry.get(), "$telemetry");
        self._telemetry.reset();
        self._telemetry_callback(self._telemetry_total.get(), "$telemetry-total");
    };
    /** Shuts down the process */
    TopologyNode.prototype.shutdown = function (callback) {
        this._isShuttingDown = true;
        this._child.send({ cmd: "shutdown" });
        this._onExit = callback;
    };
    /** Initializes system object that represents child process.
     * Attaches to all relevant alerts. Sends init data to child process.
    */
    TopologyNode.prototype.init = function (callback) {
        var self = this;
        self._pendingInitCallback = callback;
        self._child.on("error", function (e) {
            self._isError = true;
            self.emit("error", e);
            if (self._pendingInitCallback) {
                self._pendingInitCallback(e);
                self._pendingInitCallback = null;
            }
        });
        self._child.on("close", function (code) {
            self._isClosed = true;
            self.emit("closed", code);
        });
        self._child.on("exit", function (code) {
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
        self._child.on("message", function (msg) {
            if (msg.cmd == "init_completed") {
                self._pendingInitCallback();
                self._pendingInitCallback = null;
                return;
            }
            self.emit(msg.cmd, msg);
        });
        self._child.send({ cmd: "init", data: self._init });
    };
    /** Adds duration to internal telemetry */
    TopologyNode.prototype._telemetryAdd = function (duration) {
        this._telemetry.add(duration);
        this._telemetry_total.add(duration);
    };
    return TopologyNode;
}(EventEmitter));
/** Wrapper for "spout" process */
var TopologySpout = (function (_super) {
    __extends(TopologySpout, _super);
    /** Constructor needs to receive all data */
    function TopologySpout(config) {
        var _this = _super.call(this, config) || this;
        var self = _this;
        self._emitCallback = config.onEmit;
        self._isPaused = true;
        self._nextCallback = null;
        self._nextTs = Date.now();
        self._nextCalledTs = null;
        self._telemetry_callback = function (data, stream_id) {
            self._emitCallback(data, stream_id, function () { });
        };
        self.on("data", function (msg) {
            self._telemetryAdd(Date.now() - self._nextCalledTs);
            // data was received from child process, send it into topology
            self._emitCallback(msg.data.data, msg.data.stream_id, function () {
                // only call callback when topology signals that processing is done
                var cb = self._nextCallback;
                self._nextCallback = null;
                self._child.send({ cmd: "spout_ack" });
                cb();
            });
        });
        self.on("empty", function () {
            self._nextTs = Date.now() + 1 * 1000; // sleep for 1sec if spout is empty
            var cb = self._nextCallback;
            self._nextCallback = null;
            cb();
        });
        return _this;
    }
    /** Sends run signal and starts the "pump"" */
    TopologySpout.prototype.run = function () {
        var _this = this;
        var self = this;
        this._isPaused = false;
        this._child.send({ cmd: "run" });
        async.whilst(function () { return !self._isPaused; }, function (xcallback) {
            if (Date.now() < _this._nextTs) {
                // if empty, sleep for a while
                var sleep = _this._nextTs - Date.now();
                setTimeout(function () { xcallback(); }, sleep);
            }
            else {
                self.next(xcallback);
            }
        }, function () { });
    };
    /** Requests next data message */
    TopologySpout.prototype.next = function (callback) {
        if (this._nextCallback) {
            throw new Error("Callback for next() is non-null.");
        }
        if (this._isPaused) {
            callback();
        }
        else {
            this._nextCallback = callback;
            this._nextCalledTs = Date.now();
            this._child.send({ cmd: "next" });
        }
    };
    /** Sends pause signal */
    TopologySpout.prototype.pause = function () {
        this._isPaused = true;
        this._child.send({ cmd: "pause" });
    };
    return TopologySpout;
}(TopologyNode));
/** Wrapper for "bolt" process */
var TopologyBolt = (function (_super) {
    __extends(TopologyBolt, _super);
    /** Constructor needs to receive all data */
    function TopologyBolt(config) {
        var _this = _super.call(this, config) || this;
        var self = _this;
        _this._allow_parallel = config.allow_parallel || false;
        _this._emitCallback = function (data, stream_id, callback) {
            if (self._isShuttingDown) {
                return callback("Bolt is shutting down:", self._name);
            }
            config.onEmit(data, stream_id, callback);
        };
        _this._inReceive = 0; // this field can be non-zero even when _ackCallback is null
        _this._pendingReceiveRequests = [];
        _this._ackCallbacks = [];
        _this._telemetry_callback = function (data, stream_id) {
            self._emitCallback(data, stream_id, function () { });
        };
        _this.on("data", function (msg) {
            var id = msg.data.id;
            self._emitCallback(msg.data.data, msg.data.stream_id, function (err) {
                self._child.send({ cmd: "ack", data: { id: id } });
            });
        });
        _this.on("ack", function (msg) {
            self._ackCallbacks[msg.data.ack_id](msg.err);
            self._ackCallbacks[msg.data.ack_id] = null;
            self._inReceive--;
            if (self._pendingReceiveRequests.length > 0) {
                var d = self._pendingReceiveRequests[0];
                self._pendingReceiveRequests = self._pendingReceiveRequests.slice(1);
                self._receive(d.data, d.stream_id, true, d.callback);
            }
        });
        return _this;
    }
    /** Sends data tuple to child process - wrapper for internal method _receive() */
    TopologyBolt.prototype.receive = function (data, stream_id, callback) {
        this._receive(data, stream_id, false, callback);
    };
    /** Internal method - sends data tuple to child process */
    TopologyBolt.prototype._receive = function (data, stream_id, from_waitlist, callback) {
        var self = this;
        var ts_start = Date.now();
        if (self._inReceive > 0 && !self._allow_parallel) {
            self._pendingReceiveRequests.push({
                data: data,
                stream_id: stream_id,
                callback: function (err) {
                    self._telemetryAdd(Date.now() - ts_start);
                    callback(err);
                }
            });
        }
        else {
            self._inReceive++;
            var cb = function (err) {
                if (!from_waitlist) {
                    self._telemetryAdd(Date.now() - ts_start);
                }
                callback(err);
            };
            var ack_index = self._addAckCallback(cb);
            self._child.send({
                cmd: "data",
                data: { data: data, stream_id: stream_id, ack_id: ack_index }
            });
        }
    };
    /** Adds given callback to internal array */
    TopologyBolt.prototype._addAckCallback = function (cb) {
        for (var i = 0; i < this._ackCallbacks.length; i++) {
            if (!this._ackCallbacks[i]) {
                this._ackCallbacks[i] = cb;
                return i;
            }
        }
        this._ackCallbacks.push(cb);
        return this._ackCallbacks.length - 1;
    };
    return TopologyBolt;
}(TopologyNode));
////////////////////////////////////////////////////////////////////////////////////
exports.TopologyBolt = TopologyBolt;
exports.TopologySpout = TopologySpout;
