"use strict";
var async = require("async");
var path = require("path");
var top_sub = require("./topology_local_subprocess");
var top_inproc = require("./topology_local_inprocess");
////////////////////////////////////////////////////////////////////
/** Class that performs redirection of messages after they are emited from nodes */
var OutputRouter = (function () {
    /** Constructor prepares the object before any information is received. */
    function OutputRouter() {
        this._sources = {};
    }
    /** This method registers binding between source and destination
     * @param {string} source - Name of source
     * @param {string} destination - Name of destination
     * @param {string} stream_id - Stream ID used for routing
     */
    OutputRouter.prototype.register = function (source, destination, stream_id) {
        if (!this._sources[source]) {
            this._sources[source] = [];
        }
        this._sources[source].push({ destination: destination, stream_id: stream_id || null });
    };
    /** Returns list of names that are destinations for data, emitted by source.
     * @param {*} source - Name of source
     * @param {string} stream_id - Stream ID used for routing
     */
    OutputRouter.prototype.getDestinationsForSource = function (source, stream_id) {
        if (!this._sources[source]) {
            return [];
        }
        return this._sources[source]
            .filter(function (x) { return x.stream_id == stream_id; })
            .map(function (x) { return x.destination; });
    };
    return OutputRouter;
}());
/** This class runs local topology */
var TopologyLocal = (function () {
    /** Constructor prepares the object before any information is received. */
    function TopologyLocal() {
        this._spouts = [];
        this._bolts = [];
        this._config = null;
        this._heartbeatTimeout = 10000;
        this._router = new OutputRouter();
        this._isRunning = false;
        this._isShuttingDown = false;
        this._heartbeatTimer = null;
        this._heartbeatCallback = null;
    }
    /** Initialization that sets up internal structure and
     * starts underlaying processes.
     */
    TopologyLocal.prototype.init = function (config, callback) {
        var self = this;
        self._config = config;
        self._heartbeatTimeout = config.general.heartbeat;
        self._initContext(function (err, context) {
            var tasks = [];
            self._config.bolts.forEach(function (bolt_config) {
                if (bolt_config.disabled) {
                    return;
                }
                bolt_config.onEmit = function (data, stream_id, callback) {
                    self._redirect(bolt_config.name, data, stream_id, callback);
                };
                var bolt = null;
                if (bolt_config.type == "sys" || bolt_config.type == "inproc") {
                    bolt = new top_inproc.TopologyBoltInproc(bolt_config, context);
                }
                else {
                    bolt = new top_sub.TopologyBolt(bolt_config, context);
                }
                self._bolts.push(bolt);
                tasks.push(function (xcallback) { bolt.init(xcallback); });
                for (var _i = 0, _a = bolt_config.inputs; _i < _a.length; _i++) {
                    var input = _a[_i];
                    self._router.register(input.source, bolt_config.name, input.stream_id);
                }
            });
            self._config.spouts.forEach(function (spout_config) {
                if (spout_config.disabled) {
                    return;
                }
                spout_config.onEmit = function (data, stream_id, callback) {
                    self._redirect(spout_config.name, data, stream_id, callback);
                };
                var spout = null;
                if (spout_config.type == "sys" || spout_config.type == "inproc") {
                    spout = new top_inproc.TopologySpoutInproc(spout_config, context);
                }
                else {
                    spout = new top_sub.TopologySpout(spout_config, context);
                }
                self._spouts.push(spout);
                tasks.push(function (xcallback) { spout.init(xcallback); });
            });
            self._runHeartbeat();
            async.series(tasks, callback);
        });
    };
    /** Sends run signal to all spouts */
    TopologyLocal.prototype.run = function () {
        console.log("Local topology started");
        for (var _i = 0, _a = this._spouts; _i < _a.length; _i++) {
            var spout = _a[_i];
            spout.run();
        }
        this._isRunning = true;
    };
    /** Sends pause signal to all spouts */
    TopologyLocal.prototype.pause = function (callback) {
        for (var _i = 0, _a = this._spouts; _i < _a.length; _i++) {
            var spout = _a[_i];
            spout.pause();
        }
        this._isRunning = false;
        callback();
    };
    /** Sends shutdown signal to all child processes */
    TopologyLocal.prototype.shutdown = function (callback) {
        var self = this;
        self._isShuttingDown = true;
        if (self._heartbeatTimer) {
            clearInterval(self._heartbeatTimer);
            self._heartbeatCallback();
        }
        self.pause(function (err) {
            var tasks = [];
            self._spouts.forEach(function (spout) {
                tasks.push(function (xcallback) {
                    spout.shutdown(xcallback);
                });
            });
            self._bolts.forEach(function (bolt) {
                tasks.push(function (xcallback) {
                    bolt.shutdown(xcallback);
                });
            });
            if (self._config.general.shutdown) {
                var factory = function (module_path) {
                    return function (xcallback) { require(module_path).shutdown(xcallback); };
                };
                for (var _i = 0, _a = self._config.general.shutdown; _i < _a.length; _i++) {
                    var shutdown_conf = _a[_i];
                    var dir = path.resolve(shutdown_conf.working_dir); // path may be relative to current working dir
                    var module_path = path.join(dir, shutdown_conf.cmd);
                    tasks.push(factory(module_path));
                }
            }
            async.series(tasks, callback);
        });
    };
    /** Runs heartbeat pump until this object shuts down */
    TopologyLocal.prototype._runHeartbeat = function () {
        var self = this;
        async.whilst(function () {
            return !self._isShuttingDown;
        }, function (xcallback) {
            self._heartbeatCallback = xcallback;
            self._heartbeatTimer = setTimeout(function () {
                if (self._isRunning) {
                    self._heartbeat();
                }
                xcallback();
            }, self._heartbeatTimeout);
        }, function () { });
    };
    /** Sends heartbeat signal to all child processes */
    TopologyLocal.prototype._heartbeat = function () {
        for (var _i = 0, _a = this._spouts; _i < _a.length; _i++) {
            var spout = _a[_i];
            spout.heartbeat();
        }
        for (var _b = 0, _c = this._bolts; _b < _c.length; _b++) {
            var bolt = _c[_b];
            bolt.heartbeat();
        }
    };
    /** This method redirects/broadcasts message from source to other nodes.
     * It is done in async/parallel manner.
     * @param {string} source - Name of the source that emitted this data
     * @param {Object} data - Data content of the message
     * @param {string} stream_id - Name of the stream that this data belongs to
     * @param {Function} callback - standard callback
     */
    TopologyLocal.prototype._redirect = function (source, data, stream_id, callback) {
        var self = this;
        var destinations = self._router.getDestinationsForSource(source, stream_id);
        async.each(destinations, function (destination, xcallback) {
            var data_clone = {};
            Object.assign(data_clone, data);
            var bolt = self._getBolt(destination);
            bolt.receive(data_clone, stream_id, xcallback);
        }, callback);
    };
    /** Find bolt with given name.
     * @param {string} name - Name of the bolt that we need to find
     */
    TopologyLocal.prototype._getBolt = function (name) {
        var hits = this._bolts.filter(function (x) { return x.getName() == name; });
        if (hits.length === 0) {
            return null;
        }
        return hits[0];
    };
    /** This method optionally runs context initialization code
     * and returns the context object.
     * @param {Function} callback - standard callback
     */
    TopologyLocal.prototype._initContext = function (callback) {
        var self = this;
        if (self._config.general.initialization) {
            var common_context_1 = {};
            async.eachSeries(self._config.general.initialization, function (init_conf, xcallback) {
                var dir = path.resolve(init_conf.working_dir); // path may be relative to current working dir
                var module_path = path.join(dir, init_conf.cmd);
                require(module_path).init(init_conf.init, common_context_1, xcallback);
            }, function (err) {
                callback(null, common_context_1);
            });
        }
        else {
            callback(null, null);
        }
    };
    return TopologyLocal;
}());
////////////////////////////////////////////////////////////////////////////////////
exports.TopologyLocal = TopologyLocal;
