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
/** Base class for topology-node contexts */
var TopologyContextNode = (function () {
    /** Creates new instance of node context */
    function TopologyContextNode(child, bindEmit) {
        var _this = this;
        this._child = child;
        this._name = null;
        this._req_cnt = 0;
        this._pendingAcks = [];
        var self = this;
        // set up default handlers for incomming messages
        this._handlers = {
            init: function (data) {
                self._name = data.name;
                if (bindEmit) {
                    data.onEmit = function (data, stream_id, callback) {
                        self._req_cnt++;
                        var req_id = self._req_cnt;
                        _this._pendingAcks.push({
                            id: req_id,
                            callback: callback
                        });
                        self._send("data", { data: data, id: req_id, stream_id: stream_id });
                    };
                }
                self._child.init(self._name, data, function (err) {
                    if (err) {
                        self._send("init_failed", err);
                    }
                    else {
                        self._send("init_completed", {});
                    }
                });
            },
            shutdown: function () {
                self._child.shutdown(function (err) {
                    process.exit(0);
                });
            },
            heartbeat: function () {
                self._child.heartbeat();
            },
            ack: function (data) {
                for (var i = 0; i < self._pendingAcks.length; i++) {
                    if (self._pendingAcks[i] && self._pendingAcks[i].id == data.id) {
                        var cb = self._pendingAcks[i].callback;
                        self._pendingAcks[i] = null;
                        cb();
                    }
                }
                self._pendingAcks = self._pendingAcks.filter(function (x) { return x !== null; });
            }
        };
        // route incomming messages from parent process to internal
        process.on('message', function (msg) {
            var cmd = msg.cmd;
            if (cmd) {
                self._handle(cmd, msg.data);
            }
        });
    }
    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    TopologyContextNode.prototype._send = function (cmd, data) {
        if (process.send) {
            process.send({ cmd: cmd, data: data });
        }
        else {
            // we're running in dev/test mode as a standalone process
            console.log("Sending command", { cmd: cmd, data: data });
        }
    };
    /** Starts infinite loop by reading messages from parent or console */
    TopologyContextNode.prototype.start = function () {
        var self = this;
        process.openStdin().addListener("data", function (d) {
            try {
                d = d.toString().trim();
                var i = d.indexOf(" ");
                if (i > 0) {
                    self._handle(d.substr(0, i), JSON.parse(d.substr(i)));
                }
                else {
                    self._handle(d, {});
                }
            }
            catch (e) {
                console.error(e);
            }
        });
    };
    /** Handles different events
     * @param {string} cmd - command/event name
     * @param {Object} data - content of the command/event
     */
    TopologyContextNode.prototype._handle = function (cmd, data) {
        if (this._handlers[cmd]) {
            this._handlers[cmd](data);
        }
    };
    return TopologyContextNode;
}());
/** Spout context object - handles communication with parent. */
var TopologyContextSpout = (function (_super) {
    __extends(TopologyContextSpout, _super);
    /** Creates new instance of spout context */
    function TopologyContextSpout(child) {
        var _this = _super.call(this, child, false) || this;
        _this._pending_ack_cb = null;
        var self = _this;
        self._handlers.next = function (data) {
            self._child.next(function (err, data, stream_id, cb) {
                if (err) {
                    // TODO is there a better option?
                    self._send("empty", {});
                }
                else if (data) {
                    _this._pending_ack_cb = cb;
                    self._send("data", { data: data, stream_id: stream_id });
                }
                else {
                    self._send("empty", {});
                }
            });
        };
        self._handlers.run = function () {
            self._child.run();
        };
        self._handlers.pause = function () {
            self._child.pause();
        };
        self._handlers.spout_ack = function () {
            if (self._pending_ack_cb) {
                self._pending_ack_cb();
            }
        };
        return _this;
    }
    return TopologyContextSpout;
}(TopologyContextNode));
/** Bolt context object - handles communication with parent. */
var TopologyContextBolt = (function (_super) {
    __extends(TopologyContextBolt, _super);
    /** Creates new instance of bolt context */
    function TopologyContextBolt(child) {
        var _this = _super.call(this, child, true) || this;
        _this._req_cnt = 0;
        _this._pending_acks = [];
        var self = _this;
        self._handlers.data = function (data) {
            self._child.receive(data.data, data.stream_id, function (err) {
                self._send("ack", { err: err, ack_id: data.ack_id });
            });
        };
        return _this;
    }
    return TopologyContextBolt;
}(TopologyContextNode));
//////////////////////////////////////////////////////////////////////////////
exports.TopologyContextSpout = TopologyContextSpout;
exports.TopologyContextBolt = TopologyContextBolt;
