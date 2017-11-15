"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const tlp = require("./topology_local_proxy");
const coord = require("./topology_coordinator");
const comp = require("../topology_compiler");
const intf = require("../topology_interfaces");
const log = require("../util/logger");
/** Utility class for holding data about single topology */
class TopologyItem {
}
/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
class TopologyWorker {
    /** Initializes this object */
    constructor(name, storage, overrides) {
        this.log_prefix = `[Worker ${name}] `;
        this.overrides = overrides || {};
        this.waiting_for_shutdown = false;
        this.topologies = [];
        let self = this;
        this.coordinator = new coord.TopologyCoordinator(name, storage, {
            startTopology: (uuid, config, callback) => {
                log.logger().important(self.log_prefix + "Received start instruction from coordinator: " + uuid);
                self.start(uuid, config, callback);
            },
            resolveTopologyMismatches: (uuids, callback) => {
                self.resolveTopologyMismatches(uuids, callback);
            },
            stopTopology: (uuid, callback) => {
                self.shutDownTopology(uuid, false, callback);
            },
            killTopology: (uuid, callback) => {
                self.shutDownTopology(uuid, true, callback);
            },
            shutdown: (callback) => {
                log.logger().important(this.log_prefix + `Received shutdown instruction from coordinator in worker (pid ${process.pid})`);
                if (!self.waiting_for_shutdown) {
                    self.waiting_for_shutdown = true;
                    log.logger().important(this.log_prefix + "Starting graceful worker shutdown...");
                    self.shutdown(callback);
                }
                ;
            },
            exit: (code) => {
                self.exit(code);
            }
        });
        process.on('uncaughtException', (err) => {
            log.logger().error(this.log_prefix + `Unhandled exception in topology worker (pid ${process.pid})`);
            log.logger().exception(err);
            if (!self.waiting_for_shutdown) {
                self.waiting_for_shutdown = true;
                log.logger().warn(this.log_prefix + "Worker shutting down gracefully");
                self.shutdown(() => {
                    log.logger().warn(this.log_prefix + "Exiting with code 1");
                    self.exit(1);
                });
            }
        });
        let common_shutdown = () => {
            if (!self.waiting_for_shutdown) {
                self.waiting_for_shutdown = true;
                log.logger().important(this.log_prefix + `Received SIGINT or SIGTERM signal in worker (pid ${process.pid})`);
                log.logger().important(this.log_prefix + "Starting graceful worker shutdown...");
                self.shutdown(() => {
                    log.logger().important(this.log_prefix + "Exiting with code 0");
                    self.exit(0);
                });
            }
        };
        process.once('SIGINT', common_shutdown);
        process.once('SIGTERM', common_shutdown);
    }
    /** Internal wrapper around process.exit */
    exit(code) {
        // TODO check process tree and make sure that everything is really shutdown
        process.exit(code);
    }
    /** Starts this worker */
    run() {
        this.coordinator.run();
    }
    /** This method verifies that all topologies are running and properly registered */
    resolveTopologyMismatches(uuids, callback) {
        let self = this;
        if (self.waiting_for_shutdown) {
            return callback();
        }
        async.series([
            (xcallback) => {
                // topologies that are running,
                // but are NOT included in the external list,
                // must be KILLED
                let to_kill = self.topologies
                    .filter(top => !uuids.includes(top.uuid))
                    .map(top => top.uuid);
                async.each(to_kill, (uuid, xxcallback) => {
                    log.logger().warn(this.log_prefix + "Topology is running but it NOT assigned to this worker, will be KILLED: " + uuid);
                    self.shutDownTopology(uuid, true, xxcallback);
                }, xcallback);
            },
            (xcallback) => {
                // topologies that are NOT running,
                // but are included in the external list,
                // must be reported as unassigned
                let to_unassign = uuids.filter(uuid => !self.hasTopology(uuid));
                async.each(to_unassign, (uuid, xxcallback) => {
                    log.logger().warn(this.log_prefix + "Topology is assigned to this worker, but it is not running here will be unassigned: " + uuid);
                    self.coordinator.reportTopology(uuid, intf.Consts.TopologyStatus.unassigned, "", xxcallback);
                }, xcallback);
            }
        ], callback);
    }
    /** Internal method ensures that a topology exits. */
    ensureExit(rec, err) {
        if (rec.proxy && !rec.proxy.hasExited()) {
            if (err) {
                log.logger().error(this.log_prefix + "THIS SHOULD NOT HAPPEN. Child process " +
                    "encountered a critical error but did not exit. KILLING child process.");
                log.logger().exception(err);
            }
            else {
                log.logger().error(this.log_prefix + "THIS SHOULD NOT HAPPEN. Child process " +
                    "should have exited. KILLING child process.");
            }
            rec.proxy.kill(() => { });
        }
    }
    /** Internal method that creates proxy for given topology item */
    createInitAndRunProxy(rec, callback) {
        let self = this;
        rec.proxy = new tlp.TopologyLocalProxy((err) => {
            self.ensureExit(rec, err);
            if (err) {
                self.removeAndReportError(rec, err, () => { }); // on exit with error
            }
            else {
                self.removeTopology(rec.uuid); // on normal exit
            }
        });
        // report topology as running, then try to start it.
        // we do this because we don't know how long this initialization will take and we could run into trouble with leader.
        self.coordinator.reportTopology(rec.uuid, intf.Consts.TopologyStatus.running, ""); // TODO: why no callback?
        rec.proxy.init(rec.uuid, rec.config, (err) => {
            if (err) {
                // Three types of errors possible:
                // - already initialized (NOT exit) -> this should not be possible
                //   since we created a new proxy and called init once.
                // - compile error (exit)
                // - internal init error (exit)
                log.logger().error(self.log_prefix + "Error while initializing topology: " + rec.uuid);
                log.logger().exception(err);
                self.ensureExit(rec, err);
                self.removeAndReportError(rec, err, () => { callback(); }); // reporting errors will be logged
            }
            else {
                self.coordinator.reportTopologyPid(rec.uuid, rec.proxy.getPid());
                rec.proxy.run((err) => {
                    if (err) {
                        // Two types of errors possible:
                        // - already running (NOT exit) -> this should not be possible
                        //   since we created a new proxy and called init and run once.
                        // - running noninitialiyed (NOT exit) -> this should not be possible
                        //   since we created a new proxy and called init successfully
                        log.logger().error(self.log_prefix + "Error while calling topology run: " + rec.uuid);
                        log.logger().exception(err);
                        self.ensureExit(rec, err);
                        self.removeAndReportError(rec, err, () => { callback(); }); // reporting errors will be logged
                    }
                    else {
                        return callback();
                    }
                });
            }
        });
    }
    /** Starts single topology.
     * Guards itself from duplicated calls.
     */
    start(uuid, config, callback) {
        let self = this;
        if (self.hasTopology(uuid)) {
            log.logger().warn(self.log_prefix + `Topology with uuid ${uuid} is already running on this worker`);
            return;
        }
        try {
            self.injectOverrides(config);
            let compiler = new comp.TopologyCompiler(config);
            compiler.compile();
            config = compiler.getWholeConfig();
            let rec = new TopologyItem();
            rec.uuid = uuid;
            rec.config = config;
            self.createInitAndRunProxy(rec, callback);
            // only change internal state when all other steps passed
            self.topologies.push(rec);
        }
        catch (err) {
            log.logger().error(this.log_prefix + "Error while creating topology proxy for " + uuid);
            log.logger().exception(err);
            self.coordinator.reportTopology(uuid, intf.Consts.TopologyStatus.error, "" + err, () => { });
        }
    }
    hasTopology(uuid) {
        return this.topologies.find(top => top.uuid == uuid) != undefined;
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
        let top = this.topologies.find(x => x.uuid == uuid);
        if (top) {
            this.ensureExit(top);
        }
        this.topologies = this.topologies.filter(x => x.uuid != uuid);
    }
    /** Shuts down the worker and all its subprocesses.
     * Does not pass any exceptions, only logs them.
     */
    shutdown(callback) {
        let self = this;
        async.series([
            (xcallback) => {
                // reports worker as closing and stops leadership
                // logs exceptions, does not return them.
                self.coordinator.preShutdown(xcallback);
            },
            (xcallback) => {
                // tries to shut down all topologies,
                // logs exceptions, does not return them.
                self.shutDownTopologies(xcallback);
            },
            (xcallback) => {
                // reports worker as dead and stops the coorinator loop,
                // logs exceptions, does not return them.
                self.coordinator.shutdown(xcallback);
            }
        ], callback);
    }
    /** Sends shutdown signals to all topologies. Will try to shutdown
     * all topologies and log any failures.
     */
    shutDownTopologies(callback) {
        let self = this;
        async.each(self.topologies, (item, xcallback) => {
            self.shutDownTopologyInternal(item, false, (err) => {
                if (err) {
                    log.logger().error(self.log_prefix + "Error while shutting down topology: " + item.uuid);
                    log.logger().exception(err);
                }
                xcallback();
            });
        }, callback);
    }
    /** Sends shut down signal to single topology */
    shutDownTopology(uuid, do_kill, callback) {
        let self = this;
        let top = self.topologies.find(top => top.uuid == uuid);
        if (top) {
            self.shutDownTopologyInternal(top, do_kill, (err) => {
                if (err) {
                    log.logger().error(self.log_prefix + "Error while shutting down topology: " + uuid);
                    log.logger().exception(err);
                }
                return callback();
            });
        }
        else {
            // Nothing to do
            return callback();
        }
    }
    /** Internal method that contains common steps for kill and shutdown sequence */
    shutDownTopologyInternal(item, do_kill, callback) {
        let self = this;
        let afterShutdown = (err) => {
            if (err) {
                log.logger().error(self.log_prefix + "Error while shutting down topology " + item.uuid);
                log.logger().exception(err);
                self.coordinator.reportTopology(item.uuid, intf.Consts.TopologyStatus.error, "" + err, callback);
            }
            else {
                log.logger().debug(self.log_prefix + "setting topology as unassigned: " + item.uuid);
                self.coordinator.reportTopology(item.uuid, intf.Consts.TopologyStatus.unassigned, "", callback);
            }
        };
        if (do_kill) {
            item.proxy.kill(afterShutdown);
        }
        else {
            item.proxy.shutdown(afterShutdown);
        }
    }
    /** Remove given topology from internal list and report an error */
    removeAndReportError(rec, err, callback) {
        this.removeTopology(rec.uuid);
        this.coordinator.reportTopology(rec.uuid, intf.Consts.TopologyStatus.error, "" + err, callback);
    }
}
exports.TopologyWorker = TopologyWorker;
//# sourceMappingURL=topology_worker.js.map