import * as intf from "../../topology_interfaces";
import * as async from "async";

//////////////////////////////////////////////////////////////////////

class MessageRec implements intf.StorageResultMessage {
    name: string;
    cmd: string;
    content: any;
}
class TopologyRec implements intf.TopologyStatus {
    uuid: string;
    config: intf.TopologyDefinition;
    status: string;
    worker: string;
    weight: number;
    enabled: boolean;
    worker_affinity: string[];
    error: string;
    last_ping: number;
}
class WorkerRec implements intf.WorkerStatus {
    name: string;
    status: string; // alive, dead, unloaded
    lstatus: string; // leader, candidate, ""
    last_ping: number;
    last_ping_d: Date;
    lstatus_ts: number;
    lstatus_ts_d: Date;
}
/////////////////////////////////////////////////////////////////////

export class MemoryCoordinator implements intf.CoordinationStorage {

    private workers: WorkerRec[];
    private topologies: TopologyRec[];
    private messages: MessageRec[];
    private workers_history: intf.WorkerStatusHistory[];
    private topologies_history: intf.TopologyStatusHistory[];

    constructor() {
        this.workers = [];
        this.topologies = [];
        this.workers_history = [];
        this.topologies_history = [];
        this.messages = [];
    }

    getProperties(callback: intf.SimpleResultCallback<intf.StorageProperty[]>) {
        let res = [];
        res.push({ key: "type", value: "MemoryCoordinator" });
        callback(null, res);
    }

    getLeadershipStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultStatus>) {
        this.disableDefunctLeaders();
        let res = "vacant";
        let leaders = this.workers.filter(x => x.lstatus == "leader").length;
        let pending = this.workers.filter(x => x.lstatus == "candidate").length;
        if (leaders > 0) {
            callback(null, { leadership: "ok" });
        } else if (pending > 0) {
            callback(null, { leadership: "pending" });
        } else {
            callback(null, { leadership: "vacant" });
        }
    }

    getWorkerStatus(callback: intf.SimpleResultCallback<intf.WorkerStatus[]>) {
        this.disableDefunctWorkers();
        let res = this.workers
            .map(x => {
                return {
                    name: x.name,
                    status: x.status,
                    lstatus: x.lstatus,
                    last_ping: x.last_ping,
                    last_ping_d: x.last_ping_d,
                    lstatus_ts: x.lstatus_ts,
                    lstatus_ts_d: x.lstatus_ts_d
                };
            });
        callback(null, res);
    }

    getTopologyStatus(callback: intf.SimpleResultCallback<intf.TopologyStatus[]>) {
        this.unassignWaitingTopologies();
        this.disableDefunctWorkers();
        let res = this.topologies
            .map(x => {
                return {
                    uuid: x.uuid,
                    status: x.status,
                    worker: x.worker,
                    weight: x.weight,
                    enabled: x.enabled,
                    error: x.error,
                    worker_affinity: x.worker_affinity
                };
            });
        callback(null, res);
    }

    getTopologiesForWorker(worker: string, callback: intf.SimpleResultCallback<intf.TopologyStatus[]>) {
        this.unassignWaitingTopologies();
        let res = this.topologies
            .filter(x => x.worker == worker)
            .map(x => {
                return {
                    uuid: x.uuid,
                    status: x.status,
                    worker: x.worker,
                    weight: x.weight,
                    enabled: x.enabled,
                    error: x.error,
                    worker_affinity: x.worker_affinity
                };
            });
        callback(null, res);
    }

    getMessages(name: string, callback: intf.SimpleResultCallback<intf.StorageResultMessage[]>) {
        this.pingWorker(name);
        let res = this.messages
            .filter(x => x.name == name)
            .map(x => { return { cmd: x.cmd, content: x.content }; });
        if (res.length > 0) {
            this.messages = this.messages
                .filter(x => x.name != name);
        }
        callback(null, res);
    }

    getTopologyInfo(uuid: string, callback: intf.SimpleResultCallback<intf.TopologyInfoResponse>) {
        let res = this.topologies
            .filter(x => x.uuid == uuid)
            .map(x => {
                return {
                    uuid: x.uuid,
                    status: x.status,
                    worker: x.worker,
                    weight: x.weight,
                    enabled: x.enabled,
                    error: x.error,
                    worker_affinity: x.worker_affinity,
                    config: x.config
                };
            });
        if (res.length == 0) {
            return callback(new Error("Requested topology not found: " + uuid));
        }
        callback(null, res[0]);
    }

    registerWorker(name: string, callback: intf.SimpleCallback) {
        let existing = this.workers.filter(x => x.name == name);
        let w = null;
        if (existing.length == 0) {
            w = {
                last_ping: Date.now(),
                last_ping_d: new Date(),
                lstatus: "",
                lstatus_ts: Date.now(),
                lstatus_ts_d: new Date(),
                name: name,
                status: "alive"
            };
            this.workers.push(w);
        } else {
            w = existing[0];
            w.last_ping = Date.now();
            w.last_ping_d = new Date();
            w.lstatus = "";
            w.lstatus_ts = Date.now();
            w.lstatus_ts_d = new Date();
            w.status = "alive";
        }
        this.notifyWorkerHistory(w);
        callback();
    }

    announceLeaderCandidacy(name: string, callback: intf.SimpleCallback) {
        let self = this;
        this.disableDefunctLeaders();
        let leaders = this.workers
            .filter(x => x.name != name && x.status == "leader")
            .length;

        let candidates = this.workers
            .filter(x => x.name <= name && x.status == "candidate")
            .length;

        if (leaders == 0 && candidates == 0) {
            this.workers
                .filter(x => x.name == name)
                .forEach(x => {
                    x.lstatus = "candidate";
                    self.notifyWorkerHistory(x);
                });
        }
        callback();
    }

    checkLeaderCandidacy(name: string, callback: intf.SimpleResultCallback<boolean>) {
        let self = this;
        this.disableDefunctLeaders();
        let obj = this.workers
            .filter(x => x.name == name);
        if (obj.length == 0) {
            return callback(new Error("Specified worker not found: " + name));
        }
        let leaders = this.workers
            .filter(x => x.name != name && x.status == "leader")
            .length;

        if (leaders == 0 && obj[0].lstatus == "candidate") {
            this.workers
                .filter(x => x.name != name && x.lstatus != "candidate")
                .forEach(x => {
                    x.lstatus = "";
                    self.notifyWorkerHistory(x);
                });
            obj[0].lstatus = "leader";
            this.notifyWorkerHistory(obj[0]);
            callback(null, true);
        } else if (obj[0].lstatus == "leader") {
            callback(null, true);
        } else {
            obj[0].lstatus = "";
            this.notifyWorkerHistory(obj[0]);
            callback(null, false);
        }
    }

    assignTopology(uuid: string, worker: string, callback: intf.SimpleCallback) {
        let self = this;
        this.topologies
            .forEach(x => {
                if (x.uuid == uuid) {
                    x.worker = worker;
                    self.notifyTopologyHistory(x);
                }
            });
        callback();
    }

    sendMessageToWorker(worker: string, cmd: string, content: any, callback: intf.SimpleCallback) {
        this.messages.push({ cmd: cmd, name: worker, content: content });
        callback();
    }

    setTopologyStatus(uuid: string, status: string, error: string, callback: intf.SimpleCallback) {
        let self = this;
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => {
                x.status = status;
                x.error = error;
                x.last_ping = Date.now(); // this field only updates when status changes
                self.notifyTopologyHistory(x);
            });
        callback();
    }

    setWorkerStatus(worker: string, status: string, callback: intf.SimpleCallback) {
        let self = this;
        this.workers
            .filter(x => x.name == worker)
            .forEach(x => {
                x.status = status;
                self.notifyWorkerHistory(x);
            });
        callback();
    }

    registerTopology(uuid: string, config: intf.TopologyDefinition, callback: intf.SimpleCallback) {
        let existing = this.topologies.filter(x => x.uuid == uuid);
        let t = null;
        if (existing.length == 0) {
            t = {
                enabled: false,
                config: config,
                status: "unassigned",
                uuid: uuid,
                weight: config.general.weight,
                worker: null,
                error: null,
                worker_affinity: config.general.worker_affinity,
                last_ping: Date.now()
            }
            this.topologies.push(t);
        } else {
            t = existing[0];
            t.config = config;
            t.weight = config.general.weight;
            t.worker_affinity = config.general.worker_affinity;
            t.last_ping = Date.now();
        }
        this.notifyTopologyHistory(t);
        callback();
    }

    disableTopology(uuid: string, callback: intf.SimpleCallback) {
        let self = this;
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => {
                x.enabled = false;
                self.notifyTopologyHistory(x);
            });
        callback();
    }

    enableTopology(uuid: string, callback: intf.SimpleCallback) {
        let self = this;
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => {
                x.enabled = true;
                self.notifyTopologyHistory(x);
            });
        callback();
    }

    deleteTopology(uuid: string, callback: intf.SimpleCallback) {
        this.topologies = this.topologies
            .filter(x => x.uuid != uuid);
        callback();
    }

    stopTopology(uuid: string, callback: intf.SimpleCallback) {
        let self = this;
        let hits = self.topologies
            .filter(x => x.uuid == uuid && x.status == "running");
        if (hits.length > 0) {
            async.series(
                [
                    (ycallback) => {
                        self.disableTopology(uuid, ycallback);
                    },
                    (ycallback) => {
                        self.sendMessageToWorker(hits[0].worker, "stop-topology", { uuid: uuid }, ycallback);
                    }
                ],
                callback
            );
        } else {
            callback();
        }
    }

    clearTopologyError(uuid: string, callback: intf.SimpleCallback) {
        let hits = this.topologies
            .filter(x => x.uuid == uuid);
        if (hits.length == 0) {
            return callback(new Error("Specified topology not found: " + uuid));
        }
        let hit = hits[0];
        if (hit.status != "error") {
            return callback(new Error("Specified topology is not marked as error: " + uuid));
        }
        hit.status = "unassigned";
        this.notifyTopologyHistory(hit);
        callback();
    }

    deleteWorker(name: string, callback: intf.SimpleCallback) {
        let hits = this.workers.filter(x => x.name == name);
        if (hits.length > 0) {
            if (hits[0].status == "unloaded") {
                this.workers = this.workers.filter(x => x.name != name);
                callback();
            } else {
                callback(new Error("Specified worker is not unloaded and and cannot be deleted."));
            }
        } else {
            callback(new Error("Specified worker doesn't exist and thus cannot be deleted."));
        }
    }

    shutDownWorker(name: string, callback: intf.SimpleCallback) {
        this.sendMessageToWorker(name, "shutdown", {}, callback);
    }

    getTopologyHistory(uuid: string, callback: intf.SimpleResultCallback<intf.TopologyStatusHistory[]>) {
        let data = this.topologies_history.filter(x => x.uuid == uuid);
        callback(null, JSON.parse(JSON.stringify(data)));
    }

    getWorkerHistory(name: string, callback: intf.SimpleResultCallback<intf.WorkerStatusHistory[]>) {
        let data = this.workers_history.filter(x => x.name == name);
        callback(null, JSON.parse(JSON.stringify(data)));
    }

    private pingWorker(name: string) {
        for (let worker of this.workers) {
            if (worker.name == name) {
                worker.last_ping = Date.now();
                break;
            }
        }
    }

    private unassignWaitingTopologies() {
        // set topologies to unassigned if they have been waiting too long
        let d = Date.now() - 30 * 1000;
        let worker_map: { [email: string]: string } = {};
        for (let worker of this.workers) {
            worker_map[worker.name] = worker.status;
        }
        for (let topology of this.topologies) {
            let change = false;
            if (topology.status == "waiting" && topology.last_ping < d) {
                topology.status = "unassigned";
                topology.worker = null;
                change = true;
            }
            if (topology.worker) {
                if (worker_map[topology.worker] == "dead") {
                    topology.status = "unassigned";
                    topology.worker = null;
                    change = true;
                }
            }
            if (change) {
                this.notifyTopologyHistory(topology);
            }
        }
    }

    private disableDefunctWorkers() {
        // disable workers that did not update their status
        let d = Date.now() - 30 * 1000;
        for (let worker of this.workers) {
            if (worker.status == "alive" && worker.last_ping < d) {
                worker.status = "dead";
                this.notifyWorkerHistory(worker);
            }
        }
    }

    private disableDefunctLeaders() {
        // disable worker that did not perform their leadership duties
        let d = Date.now() - 10 * 1000;
        for (let worker of this.workers) {
            if (worker.lstatus == "leader" || worker.lstatus == "candidate") {
                if (worker.last_ping < d) {
                    worker.lstatus = "";
                    this.notifyWorkerHistory(worker);
                }
            }
        }
    }

    private notifyTopologyHistory(top: TopologyRec) {
        this.topologies_history.push({
            enabled: top.enabled,
            status: top.status,
            ts: new Date(),
            uuid: top.uuid,
            weight: top.weight,
            worker: top.worker,
            error: top.error,
            worker_affinity: top.worker_affinity
        });
    }

    private notifyWorkerHistory(w: WorkerRec) {
        this.workers_history.push({
            last_ping: w.last_ping,
            last_ping_d: w.last_ping_d,
            lstatus: w.lstatus,
            lstatus_ts: w.lstatus_ts,
            lstatus_ts_d: w.lstatus_ts_d,
            name: w.name,
            status: w.status,
            ts: new Date()
        });
    }
}
