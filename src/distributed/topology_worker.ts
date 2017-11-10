import * as async from "async";
import * as tlp from "./topology_local_proxy";
import * as coord from "./topology_coordinator";
import * as comp from "../topology_compiler";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

/** Utility class for holding data about single topology */
class TopologyItem {
    uuid: string;
    config: any;
    proxy: tlp.TopologyLocalProxy;
}

/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
export class TopologyWorker {
    private log_prefix: string;
    private overrides: any;
    private coordinator: coord.TopologyCoordinator;
    private topologies: TopologyItem[];
    private waiting_for_shutdown: boolean;

    /** Initializes this object */
    constructor(name: string, storage: intf.CoordinationStorage, overrides?: object) {
        this.log_prefix = `[Worker ${name}] `;
        this.overrides = overrides || {};
        this.waiting_for_shutdown = false;
        this.topologies = [];

        let self = this;
        this.coordinator = new coord.TopologyCoordinator(name, storage, {
            startTopology: (uuid: string, config: any, callback: intf.SimpleCallback) => {
                log.logger().important(self.log_prefix + "Received start instruction from coordinator: " + uuid);
                self.start(uuid, config);
                callback();
            },
            resolveTopologyMismatches: (uuids: string[], callback: intf.SimpleCallback) => {
                self.resolveTopologyMismatches(uuids, callback);
            },
            stopTopology: (uuid: string, callback: intf.SimpleCallback) => {
                self.shutDownTopology(uuid, false, callback);
            },
            killTopology: (uuid: string, callback: intf.SimpleCallback) => {
                self.shutDownTopology(uuid, true, callback);
            },
            shutdown: () => {
                log.logger().important(this.log_prefix + `Received shutdown instruction from coordinator in worker (pid ${process.pid})`);
                if (!self.waiting_for_shutdown) {
                    self.waiting_for_shutdown = true;
                    log.logger().important(this.log_prefix + "Starting graceful worker shutdown...");
                    self.shutdown(() => {
                        log.logger().important(this.log_prefix + "Exiting with code 0");
                        process.exit(0);
                    });
                };
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
                    process.exit(1);
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
                    process.exit(0);
                });
            }
        };
        process.once('SIGINT', common_shutdown);
        process.once('SIGTERM', common_shutdown);
    }

    /** Starts this worker */
    run(): void {
        this.coordinator.run();
    }

    /** This method verifies that all topologies are running and properly registered */
    private resolveTopologyMismatches(uuids: string[], callback: intf.SimpleCallback): void {
        let self = this;
        if (self.waiting_for_shutdown) {
            return callback();
        }
        async.series(
            [
                (xcallback) => {
                    // topologies that are running,
                    // but are NOT included in the external list,
                    // must be reported as unassigned
                    let to_stop = self.topologies
                        .filter(y => {
                            return (uuids.indexOf(y.uuid) < 0);
                        })
                        .map(x => x.uuid);
                    async.each(
                        to_stop,
                        (uuid: string, xxcallback) => {
                            log.logger().warn(this.log_prefix + "Topology is running but it NOT assigned to this worker, will be KILLED: " + uuid);
                            self.shutDownTopology(uuid, true, xxcallback);
                        },
                        xcallback);
                },
                (xcallback) => {
                    // topologies that are NOT running,
                    // but are included in the external list,
                    // must be reported as unassigned
                    let to_unassign = uuids.filter(y => {
                        return (self.topologies.filter(x => x.uuid == y).length == 0);
                    });
                    async.each(
                        to_unassign,
                        (uuid, xxcallback) => {
                            log.logger().warn(this.log_prefix + "Topology is assigned to this worker, but it is not running here: " + uuid);
                            self.coordinator.reportTopology(uuid, intf.Consts.TopologyStatus.unassigned, "", xxcallback);
                        },
                        xcallback);
                }
            ],
            callback
        );
    }

    /** Internal method that creates proxy for given topology item */
    private createProxy(rec: TopologyItem): void {
        let self = this;
        rec.proxy = new tlp.TopologyLocalProxy((err) => {
            if (err) {
                self.removeAndReportError(rec, err);
            } else {
                self.removeTopology(rec.uuid);
            }
            // TODO: check this
            // if (self.waiting_for_shutdown || rec.proxy.hasExited()) {
            //     self.removeTopology(rec.uuid);
            // } else {
            //     self.removeAndReportError(rec, err);
            // }
        });
        // report topology as running, then try to start it.
        // we do this because we don't know how long this initialization will take and we could run into trouble with leader.
        self.coordinator.reportTopology(rec.uuid, intf.Consts.TopologyStatus.running, ""); // TODO: why no callback?

        rec.proxy.init(rec.uuid, rec.config, (err) => {
            if (err) {
                self.removeAndReportError(rec, err);
            } else {
                self.coordinator.reportTopologyPid(rec.uuid, rec.proxy.getPid());
                rec.proxy.run((err) => {
                    if (err) {
                        self.removeAndReportError(rec, err);
                    }
                });
            }
        });
    }

    /** Starts single topology */
    private start(uuid: string, config: any) {
        let self = this;
        if (self.topologies.filter(x => x.uuid == uuid).length > 0) {
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
            self.createProxy(rec);

            // only change internal state when all other steps passed
            self.topologies.push(rec);
        } catch (err) {
            log.logger().error(this.log_prefix + "Error while creating topology proxy for " + uuid);
            log.logger().exception(err);
            self.coordinator.reportTopology(uuid, intf.Consts.TopologyStatus.error, "" + err, () => { });
        }
    }

    /** This method injects override values into variables section of the configuration. */
    private injectOverrides(config: any) {
        config.variables = config.variables || {};
        for (let f in this.overrides) {
            if (this.overrides.hasOwnProperty(f)) {
                config.variables[f] = this.overrides[f];
            }
        }
    }

    /** Remove specified topology from internal list */
    private removeTopology(uuid: string) {
        this.topologies = this.topologies.filter(x => x.uuid != uuid);
    }

    /** Shuts down the worker and all its subprocesses. */
    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        async.series(
            [
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
            ],
            callback
        );
    }

    /** Sends shutdown signals to all topologies */
    private shutDownTopologies(callback: intf.SimpleCallback) {
        let self = this;
        let first_err: Error = null;
        async.each(
            self.topologies,
            (item: TopologyItem, xcallback) => {
                self.shutDownTopologyInternal(item, false, (err) => {
                    if (err) {
                        log.logger().error(self.log_prefix + "Error while shutting down topology: " + item.uuid);
                        log.logger().exception(err);
                    }
                    first_err = first_err || err;
                    xcallback(null);
                });
            },
            () => {
                callback(first_err);
            }
        );
    }

    /** Sends shut down signal to single topology */
    private shutDownTopology(uuid: string, do_kill: boolean, callback: intf.SimpleCallback) {
        let self = this;
        let hits = self.topologies.filter(x => x.uuid == uuid);
        if (hits.length > 0) {
            let hit = hits[0];
            self.shutDownTopologyInternal(hit, do_kill, callback);
        } else {
            callback();
        }
    }

    /** Internal method that contains common steps for kill and shutdown sequence */
    private shutDownTopologyInternal(item: TopologyItem, do_kill: boolean, callback: intf.SimpleCallback) {
        let self = this;
        async.series(
            [
                (xcallback) => {
                    if (do_kill) {
                        item.proxy.kill(xcallback);
                    } else {
                        item.proxy.shutdown(xcallback);
                    }
                }
            ],
            (err) => {
                if (err) {
                    log.logger().error(self.log_prefix + "Error while shutting down topology " + item.uuid);
                    log.logger().exception(err);
                    self.coordinator.reportTopology(item.uuid, intf.Consts.TopologyStatus.error, "" + err, callback);
                } else {
                    log.logger().debug(self.log_prefix + "setting topology as unassigned: " + item.uuid);
                    self.coordinator.reportTopology(item.uuid, intf.Consts.TopologyStatus.unassigned, "", callback);
                }
            }
        );
    }

    /** Remove given topology from internal list and report an error */
    private removeAndReportError(rec: TopologyItem, err: Error) {
        this.removeTopology(rec.uuid);
        this.coordinator.reportTopology(rec.uuid, intf.Consts.TopologyStatus.error, "" + err);
    }
}
