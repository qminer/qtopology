import * as async from "async";
import * as tlp from "./topology_local_proxy";
import * as coord from "./topology_coordinator";
import * as comp from "../topology_compiler";
import * as intf from "../topology_interfaces";

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

    private _name: string;
    private _coordinator: coord.TopologyCoordinator;
    private _topologies: TopologyItem[];

    /** Initializes this object */
    constructor(options) {
        this._name = options.name;
        this._coordinator = new coord.TopologyCoordinator(options.name, options.storage);
        this._topologies = [];

        let self = this;
        self._coordinator.on("start", (msg) => {
            self._start(msg.uuid, msg.config);
        });
        self._coordinator.on("shutdown", (msg) => {
            self.shutdown(() => { });
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
        let rec = new TopologyItem();
        rec.uuid = uuid;
        rec.config = config;
        self._topologies.push(rec);
        rec.proxy = new tlp.TopologyLocalProxy((err) => {
            console.log("*** in worker shutdown handler", err)
            if (err) {
                self._coordinator.reportTopology(uuid, "error", "" + err);
            } else {
                self._coordinator.reportTopology(uuid, "stopped", "" + err);
            }
            self._removeTopology(uuid);
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
    _removeTopology(uuid: string) {
        this._topologies = this._topologies.filter(x => x.uuid != uuid);
    }

    /** Shuts down the worker and all its subprocesses. */
    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        async.each(
            self._topologies,
            (item, xcallback) => {
                item.proxy.shutdown((err) => {
                    if (err) {
                        console.log("Error while shutting down topology", item.uuid, err);
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
