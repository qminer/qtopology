"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const tlp = require("./topology_local_proxy");
const coord = require("./topology_coordinator");
const comp = require("../topology_compiler");
const log = require("../util/logger");
const fe = require("../util/freq_estimator");
class TopologyItem {
}
/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
class TopologyWorker {
    /** Initializes this object */
    constructor(name, storage, overrides) {
        this.name = name;
        this.log_prefix = `[Worker ${name}] `;
        this.overrides = overrides || {};
        this.coordinator = new coord.TopologyCoordinator(name, storage);
        this.waiting_for_shutdown = false;
        this.topologies = [];
        let self = this;
        self.coordinator.on("start", (msg) => {
            log.logger().important(this.log_prefix + "Received start instruction from coordinator: " + msg.uuid);
            self.start(msg.uuid, msg.config);
        });
        self.coordinator.on("verify-topology", (msg) => {
            let uuid = msg.uuid;
            if (self.topologies.filter(x => x.uuid == uuid).length == 0) {
                log.logger().log(this.log_prefix + "Topology is assigned to this worker, but it is not running here: " + msg.uuid);
                self.coordinator.reportTopology(uuid, "unassigned", "", () => { });
            }
        });
        self.coordinator.on("stop-topology", (msg) => {
            let uuid = msg.uuid;
            self.shutDownTopology(uuid, () => { });
        });
        self.coordinator.on("shutdown", (msg) => {
            log.logger().important(this.log_prefix + "Received shutdown instruction from coordinator");
            self.shutdown(() => { });
        });
        process.on('uncaughtException', (err) => {
            log.logger().error(this.log_prefix + "Unhandled exception caught");
            log.logger().exception(err);
            log.logger().warn(this.log_prefix + "Worker shutting down gracefully");
            self.shutdown(() => {
                process.exit(1);
            });
        });
        process.on('SIGINT', () => {
            if (!self.waiting_for_shutdown) {
                self.waiting_for_shutdown = true;
                log.logger().important(this.log_prefix + "Received Shutdown signal from system");
                log.logger().important(this.log_prefix + "Starting graceful worker shutdown...");
                self.shutdown(() => {
                    process.exit(1);
                });
            }
        });
    }
    /** Starts this worker */
    run() {
        this.coordinator.run();
    }
    /** Internal method that creates proxy for given topology item */
    createProxy(rec) {
        let self = this;
        rec.proxy = new tlp.TopologyLocalProxy((err) => {
            if (rec.proxy.wasShutDown()) {
                self.removeTopology(rec.uuid);
            }
            else {
                // check if topology restarted a lot recently
                let score = rec.error_frequency_score.add(new Date());
                let too_often = (score >= 10);
                if (too_often) {
                    //  report error and remove
                    self.coordinator.reportTopology(rec.uuid, "error", "" + err);
                    self.removeTopology(rec.uuid);
                }
                else {
                    // not too often, just restart
                    setTimeout(() => {
                        self.createProxy(rec);
                    }, 0);
                }
            }
        });
        rec.proxy.init(rec.uuid, rec.config, (err) => {
            if (err) {
                self.removeTopology(rec.uuid);
                self.coordinator.reportTopology(rec.uuid, "error", "" + err);
            }
            else {
                rec.proxy.run((err) => {
                    if (err) {
                        self.removeTopology(rec.uuid);
                        self.coordinator.reportTopology(rec.uuid, "error", "" + err);
                    }
                    else {
                        self.coordinator.reportTopology(rec.uuid, "running", "");
                    }
                });
            }
        });
    }
    /** Starts single topology */
    start(uuid, config) {
        let self = this;
        try {
            self.injectOverrides(config);
            let compiler = new comp.TopologyCompiler(config);
            compiler.compile();
            config = compiler.getWholeConfig();
            if (self.topologies.filter(x => x.uuid === uuid).length > 0) {
                self.coordinator.reportTopology(uuid, "error", "Topology with this UUID already exists: " + uuid);
                return;
            }
            let rec = new TopologyItem();
            rec.uuid = uuid;
            rec.config = config;
            rec.error_frequency_score = new fe.EventFrequencyScore(10 * 60 * 1000);
            self.createProxy(rec);
            // only change internal state when all other steps passed
            self.topologies.push(rec);
        }
        catch (err) {
            log.logger().error(this.log_prefix + "Error while creating topology proxy for " + uuid);
            log.logger().exception(err);
            self.coordinator.reportTopology(uuid, "error", "" + err, () => { });
        }
    }
    /** This method injects override values into variables section of the configuration. */
    injectOverrides(config) {
        config.variables = config.variables || {};
        for (let f in this.overrides) {
            if (this.overrides.hasOwnProperty(f)) {
                config.variables[f] = this.overrides[f];
            }
        }
    }
    /** Remove specified topology from internal list */
    removeTopology(uuid) {
        this.topologies = this.topologies.filter(x => x.uuid != uuid);
    }
    /** Shuts down the worker and all its subprocesses. */
    shutdown(callback) {
        let self = this;
        async.series([
            (xcallback) => {
                self.coordinator.preShutdown(xcallback);
            },
            (xcallback) => {
                log.logger().warn(self.log_prefix + "calling shutDownTopologies");
                self.shutDownTopologies((err) => {
                    log.logger().debug(self.log_prefix + "shutDownTopologies was called, " + err);
                    if (err) {
                        log.logger().error(this.log_prefix + "Error while shutting down topologies:");
                        log.logger().exception(err);
                    }
                    xcallback();
                });
            },
            (xcallback) => {
                log.logger().important(this.log_prefix + "shutting down coordinator:");
                self.coordinator.shutdown(xcallback);
            }
        ], callback);
    }
    shutDownTopologies(callback) {
        let self = this;
        async.each(self.topologies, (itemx, xcallback) => {
            let item = itemx;
            self.shutDownTopologyInternal(item, xcallback);
        }, callback);
    }
    shutDownTopology(uuid, callback) {
        let self = this;
        let hits = self.topologies.filter(x => x.uuid == uuid);
        if (hits.length >= 0) {
            let hit = hits[0];
            self.shutDownTopologyInternal(hit, callback);
        }
        else {
            callback();
        }
    }
    shutDownTopologyInternal(item, callback) {
        let self = this;
        item.proxy.shutdown((err) => {
            if (err) {
                log.logger().error("[Worker] Error while shutting down topology " + item.uuid);
                log.logger().exception(err);
                self.coordinator.reportTopology(item.uuid, "error", "" + err, () => { });
            }
            else {
                log.logger().debug("[Worker] setting topology as unassigned: " + item.uuid);
                self.coordinator.reportTopology(item.uuid, "unassigned", "", () => { });
            }
        });
    }
}
exports.TopologyWorker = TopologyWorker;
//# sourceMappingURL=topology_worker.js.map