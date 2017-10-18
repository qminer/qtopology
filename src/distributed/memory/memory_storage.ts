import * as intf from "../../topology_interfaces";
import * as async from "async";

//////////////////////////////////////////////////////////////////////

class MessageRec implements intf.StorageResultMessage {
    name: string;
    cmd: string;
    content: any;
    created: Date;
    valid_until: number;
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
    last_ping_d: Date;
}
class WorkerRec implements intf.WorkerStatus {
    name: string;
    status: string;
    lstatus: string;
    last_ping: number;
    last_ping_d: Date;
    lstatus_ts: number;
    lstatus_ts_d: Date;
}

/////////////////////////////////////////////////////////////////////

export class MemoryStorage implements intf.CoordinationStorage {

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
        res.push({ key: "type", value: "MemoryStorage" });
        res.push({ key: "pending-messages", value: this.messages.length });
        callback(null, res);
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
                    last_ping: x.last_ping,
                    last_ping_d: x.last_ping_d,
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
                    last_ping: x.last_ping,
                    last_ping_d: x.last_ping_d,
                    worker_affinity: x.worker_affinity
                };
            });
        callback(null, res);
    }

    getMessages(name: string, callback: intf.SimpleResultCallback<intf.StorageResultMessage[]>) {
        this.pingWorker(name);
        let res1 = this.messages
            .filter(x => x.name == name);
        if (res1.length > 0) {
            this.messages = this.messages
                .filter(x => x.name != name);
        }
        let now = Date.now();
        let res = res1
            .filter(x => x.valid_until > now)
            .map(x => { return { cmd: x.cmd, content: x.content, created: x.created }; });
        callback(null, res.filter(x => x));
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
                    last_ping: x.last_ping,
                    last_ping_d: x.last_ping_d,
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
                lstatus: intf.Consts.WorkerLStatus.normal,
                lstatus_ts: Date.now(),
                lstatus_ts_d: new Date(),
                name: name,
                status: intf.Consts.WorkerStatus.alive
            };
            this.workers.push(w);
        } else {
            w = existing[0];
            w.last_ping = Date.now();
            w.last_ping_d = new Date();
            w.lstatus = intf.Consts.WorkerLStatus.normal;
            w.lstatus_ts = Date.now();
            w.lstatus_ts_d = new Date();
            w.status = intf.Consts.WorkerStatus.alive;
        }
        this.notifyWorkerHistory(w);
        callback();
    }

    announceLeaderCandidacy(name: string, callback: intf.SimpleCallback) {
        let self = this;
        this.disableDefunctLeaders();
        let leaders = this.workers
            .filter(x => x.name != name && x.lstatus == intf.Consts.WorkerLStatus.leader)
            .length;

        let candidates = this.workers
            .filter(x => x.name <= name && x.lstatus == intf.Consts.WorkerLStatus.candidate)
            .length;

        if (leaders == 0 && candidates == 0) {
            this.workers
                .filter(x => x.name == name)
                .forEach(x => {
                    x.lstatus = intf.Consts.WorkerLStatus.candidate;
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
            .filter(x => x.name != name && x.lstatus == intf.Consts.WorkerLStatus.leader)
            .length;

        if (leaders == 0 && obj[0].lstatus == intf.Consts.WorkerLStatus.candidate) {
            this.workers
                .filter(x => x.name != name && x.lstatus != intf.Consts.WorkerLStatus.candidate)
                .forEach(x => {
                    x.lstatus = intf.Consts.WorkerLStatus.normal;
                    self.notifyWorkerHistory(x);
                });
            obj[0].lstatus = intf.Consts.WorkerLStatus.leader;
            this.notifyWorkerHistory(obj[0]);
            callback(null, true);
        } else if (obj[0].lstatus == intf.Consts.WorkerLStatus.leader) {
            callback(null, true);
        } else {
            obj[0].lstatus = intf.Consts.WorkerLStatus.normal;
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

    sendMessageToWorker(worker: string, cmd: string, content: any, valid_msec: number, callback: intf.SimpleCallback) {
        this.messages.push({ cmd: cmd, name: worker, content: content, created: new Date(), valid_until: Date.now() + valid_msec });
        callback();
    }

    setTopologyStatus(uuid: string, status: string, error: string, callback: intf.SimpleCallback) {
        let self = this;
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => {
                x.status = status;
                x.error = error;
                x.last_ping_d = new Date(); // this field only updates when status changes
                x.last_ping = x.last_ping_d.getTime(); // this field only updates when status changes
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

    setWorkerLStatus(worker: string, lstatus: string, callback: intf.SimpleCallback) {
        let self = this;
        this.workers
            .filter(x => x.name == worker)
            .forEach(x => {
                x.lstatus = lstatus;
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
                status: intf.Consts.TopologyStatus.unassigned,
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
            .filter(x => x.uuid == uuid && x.status == intf.Consts.TopologyStatus.running);
        if (hits.length > 0) {
            async.series(
                [
                    (ycallback) => {
                        self.disableTopology(uuid, ycallback);
                    },
                    (ycallback) => {
                        self.sendMessageToWorker(hits[0].worker, intf.Consts.LeaderMessages.stop_topology, { uuid: uuid }, 30 * 1000, ycallback);
                    }
                ],
                callback
            );
        } else {
            callback();
        }
    }

    killTopology(uuid: string, callback: intf.SimpleCallback) {
        let self = this;
        let hits = self.topologies
            .filter(x => x.uuid == uuid && x.status == intf.Consts.TopologyStatus.running);
        if (hits.length > 0) {
            async.series(
                [
                    (ycallback) => {
                        self.disableTopology(uuid, ycallback);
                    },
                    (ycallback) => {
                        self.sendMessageToWorker(hits[0].worker, intf.Consts.LeaderMessages.kill_topology, { uuid: uuid }, 30 * 1000, ycallback);
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
        if (hit.status != intf.Consts.TopologyStatus.error) {
            return callback(new Error("Specified topology is not marked as error: " + uuid));
        }
        hit.status = intf.Consts.TopologyStatus.unassigned;
        this.notifyTopologyHistory(hit);
        callback();
    }

    deleteWorker(name: string, callback: intf.SimpleCallback) {
        let hits = this.workers.filter(x => x.name == name);
        if (hits.length > 0) {
            if (hits[0].status == intf.Consts.WorkerStatus.unloaded) {
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
        this.sendMessageToWorker(name, intf.Consts.LeaderMessages.shutdown, {}, 60 * 1000, callback);
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
            if (topology.status == intf.Consts.TopologyStatus.waiting && topology.last_ping < d) {
                topology.status = intf.Consts.TopologyStatus.unassigned;
                topology.worker = null;
                change = true;
            }
            if (topology.worker) {
                if (worker_map[topology.worker] == intf.Consts.WorkerStatus.dead) {
                    topology.status = intf.Consts.TopologyStatus.unassigned;
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
            if (worker.status == intf.Consts.WorkerStatus.alive && worker.last_ping < d) {
                worker.status = intf.Consts.WorkerStatus.dead;
                this.notifyWorkerHistory(worker);
            }
        }
    }

    private disableDefunctLeaders() {
        // disable worker that did not perform their leadership duties
        let d = Date.now() - 10 * 1000;
        for (let worker of this.workers) {
            if (worker.lstatus == intf.Consts.WorkerLStatus.leader || worker.lstatus == intf.Consts.WorkerLStatus.candidate) {
                if (worker.last_ping < d) {
                    worker.lstatus = intf.Consts.WorkerLStatus.normal;
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
            last_ping: top.last_ping,
            last_ping_d: top.last_ping_d,
            worker_affinity: top.worker_affinity
        });
    }

    private notifyWorkerHistory(w: WorkerRec) {
        this.workers_history.push({
            lstatus: w.lstatus,
            name: w.name,
            status: w.status,
            ts: new Date()
        });
    }
}
