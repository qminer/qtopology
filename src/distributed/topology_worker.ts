import * as async from "async";
import * as tlp from "./topology_local_proxy";
import * as coord from "./topology_coordinator";
import * as comp from "../topology_compiler";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as ctp from "../util/crontab_parser";

/** Utility class for holding data about single topology */
class TopologyItem {
    public uuid: string;
    public config: any;
    public proxy: tlp.TopologyLocalProxy;
}

/** Definition of parameters for creatio0n of new worker object */
export interface ITopologyWorkerParams {
    /** Worker name */
    name: string;
    /** Storage object to use */
    storage: intf.ICoordinationStorage;
    /** Additional data inside an object that is injected into each topology definition. Optional. */
    overrides?: object;
    /** Optional. Either CRON-like expression or a function that tests if the worker should be dormant. */
    is_dormant_period?: string | (() => boolean);
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
    private is_dormant_period: () => boolean;
    private cron_tester: ctp.CronTabParser;

    /** Initializes this object */
    constructor(options: ITopologyWorkerParams) {
        this.log_prefix = `[Worker ${options.name}] `;
        this.overrides = options.overrides || {};
        this.is_dormant_period = (() => false);
        if (options.is_dormant_period) {
            if (typeof options.is_dormant_period === "string") {
                this.cron_tester = new ctp.CronTabParser(options.is_dormant_period);
                this.is_dormant_period = (() => {
                    return this.cron_tester.isIncluded(new Date());
                });
            } else {
                this.is_dormant_period = options.is_dormant_period;
            }
        }
        this.waiting_for_shutdown = false;
        this.topologies = [];

        const self = this;
        this.coordinator = new coord.TopologyCoordinator(options.name, options.storage, {
            exit: (code: number) => {
                self.exit(code);
            },
            is_dormant_period: (): boolean => {
                return self.is_dormant_period();
            },
            killTopology: (uuid: string, callback: intf.SimpleCallback) => {
                self.shutDownTopology(uuid, true, callback);
            },
            resolveTopologyMismatches: (uuids: string[], callback: intf.SimpleCallback) => {
                self.resolveTopologyMismatches(uuids, callback);
            },
            shutdown: (callback: intf.SimpleCallback) => {
                log.logger().important(
                    this.log_prefix + `Received shutdown instruction from coordinator in worker (pid ${process.pid})`);
                if (!self.waiting_for_shutdown) {
                    self.waiting_for_shutdown = true;
                    log.logger().important(this.log_prefix + "Starting graceful worker shutdown...");
                    self.shutdown(callback);
                }
            },
            startTopology: (uuid: string, config: any, callback: intf.SimpleCallback) => {
                log.logger().important(self.log_prefix + "Received start instruction from coordinator: " + uuid);
                self.start(uuid, config, callback);
            },
            stopAllTopologies: (callback: intf.SimpleCallback) => {
                self.shutDownTopologies(callback);
            },
            stopTopology: (uuid: string, callback: intf.SimpleCallback) => {
                self.shutDownTopology(uuid, false, callback);
            }
        });

        process.on("uncaughtException", err => {
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
        const common_shutdown = () => {
            if (!self.waiting_for_shutdown) {
                self.waiting_for_shutdown = true;
                log.logger().important(
                    this.log_prefix + `Received SIGINT or SIGTERM signal in worker (pid ${process.pid})`);
                log.logger().important(
                    this.log_prefix + "Starting graceful worker shutdown...");
                self.shutdown(() => {
                    log.logger().important(this.log_prefix + "Exiting with code 0");
                    self.exit(0);
                });
            }
        };
        process.once("SIGINT", common_shutdown);
        process.once("SIGTERM", common_shutdown);
    }

    /** Starts this worker */
    public run(): void {
        this.coordinator.run();
    }

    /** Shuts down the worker and all its subprocesses.
     * Does not pass any exceptions, only logs them.
     */
    public shutdown(callback: intf.SimpleCallback) {
        async.series(
            [
                xcallback => {
                    // reports worker as closing and stops leadership
                    // logs exceptions, does not return them.
                    this.coordinator.preShutdown(xcallback);
                },
                xcallback => {
                    // tries to shut down all topologies,
                    // logs exceptions, does not return them.
                    this.shutDownTopologies(xcallback);
                },
                xcallback => {
                    // reports worker as dead and stops the coorinator loop,
                    // logs exceptions, does not return them.
                    this.coordinator.shutdown(xcallback);
                }
            ],
            callback
        );
    }

    /** Internal wrapper around process.exit */
    private exit(code: number) {
        // TODO check process tree and make sure that everything is really shutdown
        process.exit(code);
    }

    /** This method verifies that all topologies are running and properly registered */
    private resolveTopologyMismatches(uuids: string[], callback: intf.SimpleCallback): void {
        const self = this;
        if (self.waiting_for_shutdown) {
            return callback();
        }
        async.series(
            [
                xcallback => {
                    // topologies that are running,
                    // but are NOT included in the external list,
                    // must be KILLED
                    const to_kill = self.topologies
                        .filter(top => !uuids.includes(top.uuid))
                        .map(top => top.uuid);
                    async.each(
                        to_kill,
                        (uuid: string, xxcallback) => {
                            log.logger().warn(
                                this.log_prefix +
                                "Topology is running but it NOT assigned to this worker, will be KILLED: " + uuid);
                            self.shutDownTopology(uuid, true, xxcallback);
                        },
                        xcallback);
                },
                xcallback => {
                    // topologies that are NOT running,
                    // but are included in the external list,
                    // must be reported as unassigned
                    const to_unassign = uuids.filter(uuid => !self.hasTopology(uuid));
                    async.each(
                        to_unassign,
                        (uuid, xxcallback) => {
                            log.logger().warn(
                                this.log_prefix +
                                "Topology is assigned to this worker, but it is not running " +
                                "here will be unassigned: " + uuid);
                            self.coordinator.reportTopology(
                                uuid, intf.CONSTS.TopologyStatus.unassigned, "",
                                xxcallback);
                        },
                        xcallback);
                }
            ],
            callback
        );
    }

    /** Internal method ensures that a topology exits. */
    private ensureExit(rec: TopologyItem, err?: Error): void {
        if (rec.proxy && !rec.proxy.hasExited()) {
            if (err) {
                log.logger().error(this.log_prefix + "THIS SHOULD NOT HAPPEN. Child process " +
                    "encountered a critical error but did not exit. KILLING child process.");
                log.logger().exception(err);
            } else {
                log.logger().error(this.log_prefix + "THIS SHOULD NOT HAPPEN. Child process " +
                    "should have exited. KILLING child process.");
            }
            rec.proxy.kill(() => {
                // no-op
            });
        }
    }

    /** Internal method that creates proxy for given topology item */
    private createInitAndRunProxy(rec: TopologyItem, callback: intf.SimpleCallback): void {
        rec.proxy = new tlp.TopologyLocalProxy(err => {
            log.logger().important(this.log_prefix + "Topology " + rec.uuid + " onExit() called.");
            this.ensureExit(rec, err);
            if (err) {
                this.removeAndReportError(rec, err, () => {
                    // no-op
                }); // on exit with error
            } else {
                this.coordinator.reportTopology(rec.uuid, intf.CONSTS.TopologyStatus.unassigned, "");
                this.removeTopology(rec.uuid); // on normal exit
            }
        });
        // report topology as running, then try to start it.
        // we do this because we don't know how long this initialization
        // will take and we could run into trouble with leader.
        this.coordinator.reportTopology(rec.uuid, intf.CONSTS.TopologyStatus.running, ""); // TODO: why no callback?
        rec.proxy.init(rec.uuid, rec.config, err => {
            if (err) {
                // Three types of errors possible:
                // - already initialized (NOT exit) -> this should not be possible
                //   since we created a new proxy and called init once.
                // - compile error (exit)
                // - internal init error (exit)
                log.logger().error(this.log_prefix + "Error while initializing topology: " + rec.uuid);
                log.logger().exception(err);
                this.ensureExit(rec, err);
                this.removeAndReportError(rec, err, () => { callback(); }); // reporting errors will be logged
            } else {
                this.coordinator.reportTopologyPid(rec.uuid, rec.proxy.getPid());
                rec.proxy.run(err_inner => {
                    if (err_inner) {
                        // Two types of errors possible:
                        // - already running (NOT exit) -> this should not be possible
                        //   since we created a new proxy and called init and run once.
                        // - running non-initialized (NOT exit) -> this should not be possible
                        //   since we created a new proxy and called init successfully
                        log.logger().error(this.log_prefix + "Error while calling topology run: " + rec.uuid);
                        log.logger().exception(err_inner);
                        this.ensureExit(rec, err_inner);
                        // reporting errors will be logged
                        this.removeAndReportError(rec, err_inner, () => { callback(); });
                    } else {
                        return callback();
                    }
                });
            }
        });
    }

    /** Starts single topology.
     * Guards itself from duplicated calls.
     */
    private start(uuid: string, config: any, callback: intf.SimpleCallback) {
        if (this.hasTopology(uuid)) {
            log.logger().warn(this.log_prefix + `Topology with uuid ${uuid} is already running on this worker`);
            return callback(); // don't send an error and stop coordinator
        }
        try {
            this.injectOverrides(config);

            const compiler = new comp.TopologyCompiler(config);
            compiler.compile();
            config = compiler.getWholeConfig();

            const rec = new TopologyItem();
            rec.uuid = uuid;
            rec.config = config;
            this.createInitAndRunProxy(rec, callback);
            // only change internal state when all other steps passed
            log.logger().important(this.log_prefix + "Added topology " + uuid + " to internal list.");
            this.topologies.push(rec);
        } catch (err) {
            log.logger().error(this.log_prefix + "Error while creating topology proxy for " + uuid);
            log.logger().exception(err);
            this.coordinator.reportTopology(
                uuid,
                intf.CONSTS.TopologyStatus.error, "" + err,
                () => {
                    // no-op
                });
        }
    }

    private hasTopology(uuid: string) {
        return this.topologies.find(top => top.uuid == uuid) != undefined;
    }

    /** This method injects override values into variables section of the configuration. */
    private injectOverrides(config: any) {
        config.variables = config.variables || {};
        for (const f in this.overrides) {
            if (this.overrides.hasOwnProperty(f)) {
                config.variables[f] = this.overrides[f];
            }
        }
    }

    /** Remove specified topology from internal list */
    private removeTopology(uuid: string) {
        const top = this.topologies.find(x => x.uuid == uuid);
        if (top) {
            let hasExited = "?";
            if (top.proxy) {
                hasExited = top.proxy.hasExited().toString();
            }
            log.logger().important(
                this.log_prefix +
                `Removing topology ${uuid} from internal list (has exited: ${hasExited})`);
            this.ensureExit(top);
        }
        this.topologies = this.topologies.filter(x => x.uuid != uuid);
    }

    /** Sends shutdown signals to all topologies. Will try to shutdown
     * all topologies and log any failures.
     */
    private shutDownTopologies(callback: intf.SimpleCallback) {
        const topologies_local = this.topologies.slice(0);
        async.each(
            topologies_local,
            (item: TopologyItem, xcallback) => {
                this.shutDownTopologyInternal(item, false, err => {
                    if (err) { // reporting error
                        log.logger().error(this.log_prefix + "Error while shutting down topology: " + item.uuid);
                        log.logger().exception(err);
                    }
                    xcallback();
                });
            },
            callback
        );
    }

    /** Sends shut down signal to single topology */
    private shutDownTopology(uuid: string, do_kill: boolean, callback: intf.SimpleCallback) {
        const top = this.topologies.find(x => x.uuid == uuid);
        if (top) {
            this.shutDownTopologyInternal(top, do_kill, err => {
                if (err) { // reporting error
                    log.logger().error(this.log_prefix + "Error while shutting down topology: " + uuid);
                    log.logger().exception(err);
                }
                return callback();
            });
        } else {
            // Nothing to do
            return callback();
        }
    }

    /** Internal method that contains common steps for kill and shutdown sequence */
    private shutDownTopologyInternal(item: TopologyItem, do_kill: boolean, callback: intf.SimpleCallback) {
        const afterShutdown = err => {
            if (err) {
                log.logger().error(this.log_prefix + "Error while shutting down topology " + item.uuid);
                log.logger().exception(err);
                this.coordinator.reportTopology(item.uuid, intf.CONSTS.TopologyStatus.error, "" + err, callback);
            } else {
                log.logger().important(this.log_prefix + "setting topology as unassigned: " + item.uuid);
                this.coordinator.reportTopology(item.uuid, intf.CONSTS.TopologyStatus.unassigned, "", callback);
            }
        };
        if (do_kill) {
            item.proxy.kill(afterShutdown);
        } else {
            item.proxy.shutdown(afterShutdown);
        }
    }

    /** Remove given topology from internal list and report an error */
    private removeAndReportError(rec: TopologyItem, err: Error, callback: intf.SimpleCallback) {
        this.removeTopology(rec.uuid);
        this.coordinator.reportTopology(rec.uuid, intf.CONSTS.TopologyStatus.error, "" + err, callback);
    }
}
