"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const tlp = require("./topology_local_proxy");
const coord = require("./topology_coordinator");
const comp = require("../topology_compiler");
class TopologyItem {
}
/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
class TopologyWorker {
    /** Initializes this object */
    constructor(name, storage) {
        this.name = name;
        this.coordinator = new coord.TopologyCoordinator(name, storage);
        this.topologies = [];
        let self = this;
        self.coordinator.on("start", (msg) => {
            console.log("[Worker] Received start instruction from coordinator");
            self.start(msg.uuid, msg.config);
        });
        self.coordinator.on("shutdown", (msg) => {
            console.log("[Worker] Received shutdown instruction from coordinator");
            self.shutdown(() => { });
        });
    }
    /** Starts this worker */
    run() {
        this.coordinator.run();
    }
    /** Starts single topology */
    start(uuid, config) {
        let compiler = new comp.TopologyCompiler(config);
        compiler.compile();
        config = compiler.getWholeConfig();
        let self = this;
        if (self.topologies.filter(x => x.uuid === uuid).length > 0) {
            self.coordinator.reportTopology(uuid, "error", "Topology with this UUID already exists: " + uuid);
            return;
        }
        let rec = new TopologyItem();
        rec.uuid = uuid;
        rec.config = config;
        self.topologies.push(rec);
        rec.proxy = new tlp.TopologyLocalProxy((err) => {
            if (!rec.proxy.wasShutDown()) {
                if (err) {
                    self.coordinator.reportTopology(uuid, "error", "" + err);
                }
                else {
                    self.coordinator.reportTopology(uuid, "stopped", "" + err);
                }
            }
            self.removeTopology(uuid);
        });
        rec.proxy.init(config, (err) => {
            if (err) {
                self.removeTopology(uuid);
                self.coordinator.reportTopology(uuid, "error", "" + err);
            }
            else {
                rec.proxy.run((err) => {
                    if (err) {
                        self.removeTopology(uuid);
                        self.coordinator.reportTopology(uuid, "error", "" + err);
                    }
                    else {
                        self.coordinator.reportTopology(uuid, "running", "");
                    }
                });
            }
        });
    }
    /** Remove specified topology from internal list */
    removeTopology(uuid) {
        this.topologies = this.topologies.filter(x => x.uuid != uuid);
    }
    /** Shuts down the worker and all its subprocesses. */
    shutdown(callback) {
        let self = this;
        async.each(self.topologies, (itemx, xcallback) => {
            let item = itemx;
            item.proxy.shutdown((err) => {
                if (err) {
                    console.log("[Worker] Error while shutting down topology", item.uuid, err);
                }
                else {
                    self.coordinator.reportTopology(item.uuid, "stopped", "", xcallback);
                }
            });
        }, (err) => {
            if (err) {
                console.log("[Worker] Error while shutting down topologies:", err);
            }
            self.coordinator.shutdown(callback);
        });
    }
}
exports.TopologyWorker = TopologyWorker;
//# sourceMappingURL=topology_worker.js.map