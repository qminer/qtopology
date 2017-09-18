"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const tlp = require("./topology_local_proxy");
const coord = require("./topology_coordinator");
const comp = require("../topology_compiler");
const intf = require("../topology_interfaces");
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
        self.coordinator.on(intf.Consts.CoordinatorMesagges.start_topology, (msg) => {
            log.logger().important(this.log_prefix + "Received start instruction from coordinator: " + msg.uuid);
            self.start(msg.uuid, msg.config);
        });
        self.coordinator.on(intf.Consts.CoordinatorMesagges.verify_topology, (msg) => {
            let uuid = msg.uuid;
            if (self.topologies.filter(x => x.uuid == uuid).length == 0) {
                log.logger().log(this.log_prefix + "Topology is assigned to this worker, but it is not running here: " + msg.uuid);
                self.coordinator.reportTopology(uuid, intf.Consts.TopologyStatus.unassigned, "", () => { });
            }
        });
        self.coordinator.on(intf.Consts.CoordinatorMesagges.stop_topology, (msg) => {
            let uuid = msg.uuid;
            self.shutDownTopology(uuid, () => { });
        });
        self.coordinator.on(intf.Consts.CoordinatorMesagges.shutdown, (msg) => {
            log.logger().important(this.log_prefix + "Received shutdown instruction from coordinator");
            if (!self.waiting_for_shutdown) {
                self.waiting_for_shutdown = true;
                self.shutdown(() => {
                    process.exit(0);
                });
            }
            ;
        });
        process.on('uncaughtException', (err) => {
            log.logger().error(this.log_prefix + "Unhandled exception caught");
            log.logger().exception(err);
            if (!self.waiting_for_shutdown) {
                self.waiting_for_shutdown = true;
                log.logger().warn(this.log_prefix + "Worker shutting down gracefully");
                self.shutdown(() => {
                    process.exit(1);
                });
            }
        });
        process.on('SIGINT', () => {
            if (!self.waiting_for_shutdown) {
                self.waiting_for_shutdown = true;
                log.logger().important(this.log_prefix + "Received Shutdown signal from system, this process id = " + process.pid);
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
            if (self.waiting_for_shutdown || rec.proxy.wasShutDown()) {
                self.removeTopology(rec.uuid);
            }
            else {
                // check if topology restarted a lot recently
                let score = rec.error_frequency_score.add(new Date());
                let too_often = (score >= 10);
                if (too_often) {
                    self.removeAndReportError(rec, err);
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
                self.removeAndReportError(rec, err);
            }
            else {
                // report topology as running, then try to start it.
                // since we don't know how long this initialization will take, we could run into trouble with leader.
                self.coordinator.reportTopology(rec.uuid, intf.Consts.TopologyStatus.running, "");
                rec.proxy.run((err) => {
                    if (err) {
                        self.removeAndReportError(rec, err);
                    }
                });
            }
        });
    }
    /** Starts single topology */
    start(uuid, config) {
        if (this.topologies.filter(x => x.uuid == uuid).length > 0) {
            log.logger().warn(this.log_prefix + `Topology with uuid ${uuid} is already running on this worker`);
            return;
        }
        let self = this;
        try {
            self.injectOverrides(config);
            let compiler = new comp.TopologyCompiler(config);
            compiler.compile();
            config = compiler.getWholeConfig();
            if (self.topologies.filter(x => x.uuid === uuid).length > 0) {
                self.coordinator.reportTopology(uuid, intf.Consts.TopologyStatus.error, "Topology with this UUID already exists: " + uuid);
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
            self.coordinator.reportTopology(uuid, intf.Consts.TopologyStatus.error, "" + err, () => { });
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
                self.shutDownTopologies((err) => {
                    if (err) {
                        log.logger().error(self.log_prefix + "Error while shutting down topologies:");
                        log.logger().exception(err);
                    }
                    xcallback();
                });
            },
            (xcallback) => {
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
                log.logger().error(self.log_prefix + "Error while shutting down topology " + item.uuid);
                log.logger().exception(err);
                self.coordinator.reportTopology(item.uuid, intf.Consts.TopologyStatus.error, "" + err, callback);
            }
            else {
                log.logger().debug(self.log_prefix + "setting topology as unassigned: " + item.uuid);
                self.coordinator.reportTopology(item.uuid, intf.Consts.TopologyStatus.unassigned, "", callback);
            }
        });
    }
    removeAndReportError(rec, err) {
        this.removeTopology(rec.uuid);
        this.coordinator.reportTopology(rec.uuid, intf.Consts.TopologyStatus.error, "" + err);
    }
}
exports.TopologyWorker = TopologyWorker;
//# sourceMappingURL=topology_worker.js.map