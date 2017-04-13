"use strict";
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
var EventEmitter = require("events");
var leader = require("./topology_leader");
/** This class handles communication with topology coordination storage.
 */
var TopologyCoordinator = (function (_super) {
    __extends(TopologyCoordinator, _super);
    /** Simple constructor */
    function TopologyCoordinator(options) {
        var _this = _super.call(this) || this;
        _this._storage = options.storage;
        _this._name = options.name;
        _this._leadership = new leader.TopologyLeader({
            storage: _this._storage,
            name: _this._name
        });
        _this._isRunning = false;
        _this._shutdownCallback = null;
        _this._loopTimeout = 2 * 1000; // 2 seconds for refresh
        return _this;
    }
    /** Runs main loop */
    TopologyCoordinator.prototype.run = function () {
        var self = this;
        self._isRunning = true;
        self._storage.registerWorker(self._name, function () { });
        self._leadership.run();
        async.whilst(function () { return self._isRunning; }, function (xcallback) {
            setTimeout(function () {
                self._handleIncommingRequests(xcallback);
            }, self._loopTimeout);
        }, function (err) {
            if (self._shutdownCallback) {
                self._shutdownCallback(err);
            }
        });
    };
    /** Shut down the loop */
    TopologyCoordinator.prototype.shutdown = function (callback) {
        var self = this;
        self._leadership.shutdown(function () {
            self._shutdownCallback = callback;
            self._isRunning = false;
        });
    };
    TopologyCoordinator.prototype.reportTopology = function (uuid, status, error, callback) {
        this._storage.setTopologyStatus(uuid, status, error, function (err) {
            if (err) {
                console.log("Couldn't report topology status");
                console.log("Topology:", uuid, status, error);
                console.log("Error:", err);
            }
            if (callback) {
                callback(err);
            }
        });
    };
    TopologyCoordinator.prototype.reportWorker = function (name, status, error, callback) {
        this._storage.setWorkerStatus(name, status, function (err) {
            if (err) {
                console.log("Couldn't report worker status");
                console.log("Worker:", name, status);
                console.log("Error:", err);
            }
            if (callback) {
                callback(err);
            }
        });
    };
    /** This method checks for new messages from coordination storage. */
    TopologyCoordinator.prototype._handleIncommingRequests = function (callback) {
        var self = this;
        self._storage.getMessages(self._name, function (err, msgs) {
            if (err)
                return callback(err);
            async.each(msgs, function (msg, xcallback) {
                if (msg.cmd === "start") {
                    self.emit("start", msg.content);
                }
                if (msg.cmd === "shutdown") {
                    self.emit("shutdown", {});
                }
            }, callback);
        });
    };
    return TopologyCoordinator;
}(EventEmitter));
////////////////////////////////////////////////////////////////////////////
exports.TopologyCoordinator = TopologyCoordinator;
