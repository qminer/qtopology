import * as async from "async";
import * as tlp from "./topology_local_proxy";
import * as coord from "./topology_coordinator";
import * as comp from "../topology_compiler";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as fe from "../util/freq_estimator";

class TopologyItem {
    uuid: string;
    config: any;
    proxy: tlp.TopologyLocalProxy;
    error_frequency_score: fe.EventFrequencyScore;
}

/** This class handles topology worker - singleton instance on
 * that registers with coordination storage, receives instructions from
 * it and runs assigned topologies as subprocesses.
*/
export class TopologyWorker {

    private name: string;
    private coordinator: coord.TopologyCoordinator;
    private topologies: TopologyItem[];

    /** Initializes this object */
    constructor(name: string, storage: intf.CoordinationStorage) {
        this.name = name;
        this.coordinator = new coord.TopologyCoordinator(name, storage);
        this.topologies = [];

        let self = this;
        self.coordinator.on("start", (msg) => {
            log.logger().important("[Worker] Received start instruction from coordinator");
            self.start(msg.uuid, msg.config);
        });
        self.coordinator.on("shutdown", (msg) => {
            log.logger().important("[Worker] Received shutdown instruction from coordinator");
            self.shutdown(() => { });
        });

        process.on('uncaughtException', (err) => {
            log.logger().error("[Worker] Unhandled exception caught");
            log.logger().exception(err);
            log.logger().warn("[Worker] Worker shutting down gracefully");
            self.shutdown(() => {
                process.exit(1);
            });
        });
        process.on('SIGINT', () => {
            log.logger().important("[Worker] Received Shutdown signal from system")
            log.logger().important("[Worker] Starting graceful worker shutdown...");
            self.shutdown(() => {
                process.exit(1);
            });
        });
    }

    /** Starts this worker */
    run(): void {
        this.coordinator.run();
    }

    /** Internal method that creates proxy for given topology item */
    private createProxy(rec: TopologyItem): void {
        let self = this;
        rec.proxy = new tlp.TopologyLocalProxy((err) => {
            if (rec.proxy.wasShutDown()) {
                self.removeTopology(rec.uuid);
            } else {
                // check if topology restarted a lot recently 
                let score = rec.error_frequency_score.add(new Date());
                let too_often = (score >= 10);
                if (too_often) {
                    //  report error and remove
                    if (err) {
                        self.coordinator.reportTopology(rec.uuid, "error", "" + err);
                    } else {
                        self.coordinator.reportTopology(rec.uuid, "stopped", "" + err);
                    }
                    self.removeTopology(rec.uuid);
                } else {
                    // not too often, just restart
                    setTimeout(() => {
                        self.createProxy(rec);
                    }, 0);
                }
            }
        });
        rec.proxy.init(rec.config, (err) => {
            if (err) {
                self.removeTopology(rec.uuid);
                self.coordinator.reportTopology(rec.uuid, "error", "" + err);
            } else {
                rec.proxy.run((err) => {
                    if (err) {
                        self.removeTopology(rec.uuid);
                        self.coordinator.reportTopology(rec.uuid, "error", "" + err);
                    } else {
                        self.coordinator.reportTopology(rec.uuid, "running", "");
                    }
                });
            }
        });
    }

    /** Starts single topology */
    private start(uuid, config) {
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
        rec.error_frequency_score = new fe.EventFrequencyScore(10 * 60 * 1000);
        self.topologies.push(rec);
        self.createProxy(rec);
    }

    /** Remove specified topology from internal list */
    private removeTopology(uuid: string) {
        this.topologies = this.topologies.filter(x => x.uuid != uuid);
    }

    /** Shuts down the worker and all its subprocesses. */
    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        async.each(
            self.topologies,
            (itemx, xcallback) => {
                let item = itemx as TopologyItem;
                item.proxy.shutdown((err) => {
                    if (err) {
                        log.logger().error("[Worker] Error while shutting down topology " + item.uuid);
                        log.logger().exception(err);
                    } else {
                        self.coordinator.reportTopology(item.uuid, "stopped", "", xcallback);
                    }
                });
            },
            (err) => {
                if (err) {
                    log.logger().error("[Worker] Error while shutting down topologies:");
                    log.logger().exception(err);
                }
                self.coordinator.shutdown(callback);
            }
        );
    }
}
