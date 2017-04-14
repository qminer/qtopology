"use strict";

const async = require("async");
const tlp = require("./topology_local_proxy");
const coord = require("./topology_coordinator");
const comp = require("../topology_compiler");

////////////////////////////////////////////////////////////////////////////

/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
class TopologyWorker {

    /** Initializes this object */
    constructor(options) {
        this._name = options.name;
        this._coordinator = new coord.TopologyCoordinator({
            name: options.name,
            storage: options.storage
        });
        this._topologies = [];

        let self = this;
        self._coordinator.on("start", (msg) => {
            self._start(msg.uuid, msg.config);
        });
        self._coordinator.on("shutdown", (msg) => {
            self.shutdown();
        });
    }

    /** Starts this worker */
    run() {
        this._coordinator.run();
    }

    /** Starts single topology */
    _start(uuid, config) {
        let compiler = new comp.TopologyCompiler(config);
        compiler.compile();
        config = compiler.getWholeConfig();

        let self = this;
        if (self._topologies.filter(x => x.uuid === uuid).length > 0) {
            self._coordinator.reportTopology(uuid, "error", "Topology with this UUID already exists: " + uuid);
            return;
        }
        let rec = { uuid: uuid, config: config };
        self._topologies.push(rec);
        rec.proxy = new tlp.TopologyLocalProxy({
            child_exit_callback: (err) => {
                if (err) {
                    self._coordinator.reportTopology(uuid, "error", "" + err);
                } else {
                    self._coordinator.reportTopology(uuid, "stopped", "" + err);
                }
                self._removeTopology(uuid);
            }
        });
        rec.proxy.init(config, (err) => {
            if (err) {
                self._removeTopology(uuid);
                self._coordinator.reportTopology(uuid, "error", "" + err);
            } else {
                rec.proxy.run((err) => {
                    if (err) {
                        self._removeTopology(uuid);
                        self._coordinator.reportTopology(uuid, "error", "" + err);
                    } else {
                        self._coordinator.reportTopology(uuid, "running", "");
                    }
                });
            }
        });
    }

    /** Remove specified topology from internal list */
    _removeTopology(uuid) {
        this._topologies = this._topologies.filter(x => x.uuid != uuid);
    }

    /** Shuts down the worker and all its subprocesses. */
    shutdown(callback) {
        let self = this;
        async.each(
            self._topologies,
            (item, xcallback) => {
                item.proxy.shutdown((err) => {
                    if (err) {
                        console.log("Error while shutting down topology", item.uuid , err);
                    } else {
                        self._coordinator.reportTopology(item.uuid, "stopped", "", xcallback);
                    }
                });
            },
            (err) => {
                if (err) {
                    console.log("Error while shutting down topologies:", err);
                }
                self._coordinator.shutdown(callback);
            }
        );
    }
}

//////////////////////////////////////////////////////////

exports.TopologyWorker = TopologyWorker;
