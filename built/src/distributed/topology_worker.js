"use strict";
var async = require("async");
var tlp = require("./topology_local_proxy");
var coord = require("./topology_coordinator");
var comp = require("../topology_compiler");
////////////////////////////////////////////////////////////////////////////
/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
var TopologyWorker = (function () {
    /** Initializes this object */
    function TopologyWorker(options) {
        this._name = options.name;
        this._coordinator = new coord.TopologyCoordinator({
            name: options.name,
            storage: options.storage
        });
        this._topologies = [];
        var self = this;
        self._coordinator.on("start", function (msg) {
            self._start(msg.uuid, msg.config);
        });
        self._coordinator.on("shutdown", function (msg) {
            self.shutdown();
        });
    }
    TopologyWorker.prototype.run = function () {
        this._coordinator.run();
    };
    /** Starts single topology */
    TopologyWorker.prototype._start = function (uuid, config) {
        var compiler = new comp.TopologyCompiler(config);
        compiler.compile();
        config = compiler.getWholeConfig();
        var self = this;
        if (self._topologies.filter(function (x) { return x.uuid === uuid; }).length > 0) {
            self._coordinator.reportTopology(uuid, "error", "Topology with this UUID already exists: " + uuid);
            return;
        }
        var rec = { uuid: uuid, config: config };
        self._topologies.push(rec);
        rec.proxy = new tlp.TopologyLocalProxy({
            child_exit_callback: function (err) {
                self._coordinator.reportTopology(uuid, "stopped", "" + err);
                self._removeTopology(uuid);
            }
        });
        rec.proxy.init(config, function (err) {
            if (err) {
                self._removeTopology(uuid);
                self._coordinator.reportTopology(uuid, "error", "" + err);
            }
            else {
                rec.proxy.run(function (err) {
                    if (err) {
                        self._removeTopology(uuid);
                        self._coordinator.reportTopology(uuid, "error", "" + err);
                    }
                    else {
                        self._coordinator.reportTopology(uuid, "running", "");
                    }
                });
            }
        });
    };
    /** Remove specified topology from internal list */
    TopologyWorker.prototype._removeTopology = function (uuid) {
        this._topologies = this._topologies.filter(function (x) { return x.uuid != uuid; });
    };
    /** Shuts down the worker and all its subprocesses. */
    TopologyWorker.prototype.shutdown = function (callback) {
        var self = this;
        async.each(self._topologies, function (item, xcallback) {
            item.proxy.shutdown(function (err) {
                self._coordinator.reportTopology(item.uuid, "stopped", "");
                xcallback();
            });
        }, function (err) {
            self._coordinator.reportWorker(self._name, "dead", "", callback);
        });
    };
    return TopologyWorker;
}());
//////////////////////////////////////////////////////////
exports.TopologyWorker = TopologyWorker;
