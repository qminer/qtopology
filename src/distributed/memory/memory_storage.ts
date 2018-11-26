import * as intf from "../../topology_interfaces";
import * as async from "async";

//////////////////////////////////////////////////////////////////////

class MessageRec implements intf.IStorageResultMessage {
    public name: string;
    public cmd: string;
    public content: any;
    public created: Date;
    public valid_until: number;
}
class TopologyRec implements intf.ITopologyStatus {
    public uuid: string;
    public config: intf.ITopologyDefinition;
    public status: string;
    public worker: string;
    public weight: number;
    public pid: number;
    public enabled: boolean;
    public worker_affinity: string[];
    public error: string;
    public last_ping: number;
    public last_ping_d: Date;
}
class WorkerRec implements intf.IWorkerStatus {
    public name: string;
    public status: string;
    public pid: number;
    public lstatus: string;
    public last_ping: number;
    public last_ping_d: Date;
    public lstatus_ts: number;
    public lstatus_ts_d: Date;
}

/////////////////////////////////////////////////////////////////////

export class MemoryStorage implements intf.ICoordinationStorage {

    private workers: WorkerRec[];
    private topologies: TopologyRec[];
    private messages: MessageRec[];
    private workers_history: intf.IWorkerStatusHistory[];
    private topologies_history: intf.ITopologyStatusHistory[];

    constructor() {
        this.workers = [];
        this.topologies = [];
        this.workers_history = [];
        this.topologies_history = [];
        this.messages = [];
    }

    public getProperties(callback: intf.SimpleResultCallback<intf.IStorageProperty[]>) {
        const res = [];
        res.push({ key: "type", value: "MemoryStorage" });
        res.push({ key: "pending-messages", value: this.messages.length });
        callback(null, res);
    }

    public getWorkerStatus(callback: intf.SimpleResultCallback<intf.IWorkerStatus[]>) {
        this.disableDefunctWorkers();
        const res = this.workers
            .map(x => {
                return {
                    last_ping: x.last_ping,
                    last_ping_d: x.last_ping_d,
                    lstatus: x.lstatus,
                    lstatus_ts: x.lstatus_ts,
                    lstatus_ts_d: x.lstatus_ts_d,
                    name: x.name,
                    pid: x.pid,
                    status: x.status
                };
            });
        callback(null, res);
    }

    public getTopologyStatus(callback: intf.SimpleResultCallback<intf.ITopologyStatus[]>) {
        this.unassignWaitingTopologies();
        this.disableDefunctWorkers();
        const res = this.topologies
            .map(x => {
                return {
                    enabled: x.enabled,
                    error: x.error,
                    last_ping: x.last_ping,
                    last_ping_d: x.last_ping_d,
                    pid: x.pid,
                    status: x.status,
                    uuid: x.uuid,
                    weight: x.weight,
                    worker: x.worker,
                    worker_affinity: x.worker_affinity
                };
            });
        callback(null, res);
    }

    public getTopologiesForWorker(worker: string, callback: intf.SimpleResultCallback<intf.ITopologyStatus[]>) {
        this.unassignWaitingTopologies();
        const res = this.topologies
            .filter(x => x.worker == worker)
            .map(x => {
                return {
                    enabled: x.enabled,
                    error: x.error,
                    last_ping: x.last_ping,
                    last_ping_d: x.last_ping_d,
                    pid: x.pid,
                    status: x.status,
                    uuid: x.uuid,
                    weight: x.weight,
                    worker: x.worker,
                    worker_affinity: x.worker_affinity
                };
            });
        callback(null, res);
    }

    public getMessages(name: string, callback: intf.SimpleResultCallback<intf.IStorageResultMessage[]>) {
        this.pingWorker(name);
        const res1 = this.messages
            .filter(x => x.name == name);
        if (res1.length > 0) {
            this.messages = this.messages
                .filter(x => x.name != name);
        }
        const now = Date.now();
        const res = res1
            .filter(x => x.valid_until > now)
            .map(x => ({ cmd: x.cmd, content: x.content, created: x.created }));
        callback(null, res.filter(x => x));
    }

    public getMessage(name: string, callback: intf.SimpleResultCallback<intf.IStorageResultMessage>) {
        this.pingWorker(name);
        const now = Date.now();
        const mIndex = this.messages
            .findIndex(x => x != undefined && x.name == name && x.valid_until > now);
        if (mIndex > -1) {
            const m = this.messages[mIndex];
            const message = { cmd: m.cmd, content: m.content, created: m.created };
            this.messages.splice(mIndex, 1);
            callback(null, message);
        } else {
            if (this.messages.length > 0) {
                this.messages = [];
            }
            callback(null, null);
        }
    }

    public getTopologyInfo(uuid: string, callback: intf.SimpleResultCallback<intf.ITopologyInfoResponse>) {
        const res = this.topologies
            .filter(x => x.uuid == uuid)
            .map(x => {
                return {
                    config: x.config,
                    enabled: x.enabled,
                    error: x.error,
                    last_ping: x.last_ping,
                    last_ping_d: x.last_ping_d,
                    pid: x.pid,
                    status: x.status,
                    uuid: x.uuid,
                    weight: x.weight,
                    worker: x.worker,
                    worker_affinity: x.worker_affinity
                };
            });
        if (res.length == 0) {
            return callback(new Error("Requested topology not found: " + uuid));
        }
        callback(null, res[0]);
    }

    public registerWorker(name: string, callback: intf.SimpleCallback) {
        const existing = this.workers.filter(x => x.name == name);
        let w = null;
        if (existing.length == 0) {
            w = {
                last_ping: Date.now(),
                last_ping_d: new Date(),
                lstatus: intf.CONSTS.WorkerLStatus.normal,
                lstatus_ts: Date.now(),
                lstatus_ts_d: new Date(),
                name,
                status: intf.CONSTS.WorkerStatus.alive
            };
            this.workers.push(w);
        } else {
            w = existing[0];
            w.last_ping = Date.now();
            w.last_ping_d = new Date();
            w.lstatus = intf.CONSTS.WorkerLStatus.normal;
            w.lstatus_ts = Date.now();
            w.lstatus_ts_d = new Date();
            w.status = intf.CONSTS.WorkerStatus.alive;
        }
        this.notifyWorkerHistory(w);
        callback();
    }

    public announceLeaderCandidacy(name: string, callback: intf.SimpleCallback) {
        const self = this;
        this.disableDefunctLeaders();
        const leaders = this.workers
            .filter(x => x.name != name && x.lstatus == intf.CONSTS.WorkerLStatus.leader)
            .length;

        const candidates = this.workers
            .filter(x => x.name <= name && x.lstatus == intf.CONSTS.WorkerLStatus.candidate)
            .length;

        if (leaders == 0 && candidates == 0) {
            this.workers
                .filter(x => x.name == name)
                .forEach(x => {
                    x.lstatus = intf.CONSTS.WorkerLStatus.candidate;
                    self.notifyWorkerHistory(x);
                });
        }
        callback();
    }

    public checkLeaderCandidacy(name: string, callback: intf.SimpleResultCallback<boolean>) {
        const self = this;
        this.disableDefunctLeaders();
        const obj = this.workers
            .filter(x => x.name == name);
        if (obj.length == 0) {
            return callback(new Error("Specified worker not found: " + name));
        }
        const leaders = this.workers
            .filter(x => x.name != name && x.lstatus == intf.CONSTS.WorkerLStatus.leader)
            .length;

        if (leaders == 0 && obj[0].lstatus == intf.CONSTS.WorkerLStatus.candidate) {
            this.workers
                .filter(x => x.name != name && x.lstatus != intf.CONSTS.WorkerLStatus.candidate)
                .forEach(x => {
                    x.lstatus = intf.CONSTS.WorkerLStatus.normal;
                    self.notifyWorkerHistory(x);
                });
            obj[0].lstatus = intf.CONSTS.WorkerLStatus.leader;
            this.notifyWorkerHistory(obj[0]);
            callback(null, true);
        } else if (obj[0].lstatus == intf.CONSTS.WorkerLStatus.leader) {
            callback(null, true);
        } else {
            obj[0].lstatus = intf.CONSTS.WorkerLStatus.normal;
            this.notifyWorkerHistory(obj[0]);
            callback(null, false);
        }
    }

    public assignTopology(uuid: string, worker: string, callback: intf.SimpleCallback) {
        const self = this;
        this.topologies
            .forEach(x => {
                if (x.uuid == uuid) {
                    x.worker = worker;
                    x.status = intf.CONSTS.TopologyStatus.waiting;
                    x.last_ping = Date.now();
                    self.notifyTopologyHistory(x);
                }
            });
        callback();
    }

    public sendMessageToWorker(
        worker: string, cmd: string, content: any, valid_msec: number,
        callback: intf.SimpleCallback
    ) {
        this.messages.push({ cmd, name: worker, content, created: new Date(), valid_until: Date.now() + valid_msec });
        callback();
    }

    public getMsgQueueContent(callback: intf.SimpleResultCallback<intf.IMsgQueueItem[]>) {
        const res = this.messages
            .map(x => {
                return {
                    cmd: x.cmd,
                    created: x.created,
                    data: x.content,
                    name: x.name,
                    valid_until: new Date(x.valid_until)
                };
            });
        callback(null, res);
    }

    public setTopologyStatus(
        uuid: string, worker: string, status: string,
        error: string, callback: intf.SimpleCallback
    ) {
        const self = this;
        this.topologies
            .filter(x => x.uuid == uuid && (!worker || worker == x.worker))
            .forEach(x => {
                x.status = status;
                x.error = error;
                x.last_ping_d = new Date(); // this field only updates when status changes
                x.last_ping = x.last_ping_d.getTime(); // this field only updates when status changes
                self.notifyTopologyHistory(x);
            });
        callback();
    }

    public setWorkerStatus(worker: string, status: string, callback: intf.SimpleCallback) {
        const self = this;
        this.workers
            .filter(x => x.name == worker)
            .forEach(x => {
                x.status = status;
                self.notifyWorkerHistory(x);
            });
        callback();
    }

    public setWorkerLStatus(worker: string, lstatus: string, callback: intf.SimpleCallback) {
        const self = this;
        this.workers
            .filter(x => x.name == worker)
            .forEach(x => {
                x.lstatus = lstatus;
                self.notifyWorkerHistory(x);
            });
        callback();
    }

    public registerTopology(uuid: string, config: intf.ITopologyDefinition, callback: intf.SimpleCallback) {
        const existing = this.topologies.filter(x => x.uuid == uuid);
        let t = null;
        if (existing.length == 0) {
            t = {
                config,
                enabled: false,
                error: null,
                last_ping: Date.now(),
                status: intf.CONSTS.TopologyStatus.unassigned,
                uuid,
                weight: config.general.weight,
                worker: null,
                worker_affinity: config.general.worker_affinity
            };
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

    public disableTopology(uuid: string, callback: intf.SimpleCallback) {
        const self = this;
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => {
                x.enabled = false;
                self.notifyTopologyHistory(x);
            });
        callback();
    }

    public enableTopology(uuid: string, callback: intf.SimpleCallback) {
        const self = this;
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => {
                x.enabled = true;
                self.notifyTopologyHistory(x);
            });
        callback();
    }

    public deleteTopology(uuid: string, callback: intf.SimpleCallback) {
        this.topologies = this.topologies
            .filter(x => x.uuid != uuid);
        callback();
    }

    public stopTopology(uuid: string, callback: intf.SimpleCallback) {
        const self = this;
        const hits = self.topologies
            .filter(x => x.uuid == uuid && x.status == intf.CONSTS.TopologyStatus.running);
        if (hits.length > 0) {
            async.series(
                [
                    ycallback => {
                        self.disableTopology(uuid, ycallback);
                    },
                    ycallback => {
                        self.sendMessageToWorker(
                            hits[0].worker, intf.CONSTS.LeaderMessages.stop_topology,
                            { uuid }, 30 * 1000, ycallback);
                    }
                ],
                callback
            );
        } else {
            callback();
        }
    }

    public killTopology(uuid: string, callback: intf.SimpleCallback) {
        const self = this;
        const hits = self.topologies
            .filter(x => x.uuid == uuid && x.status == intf.CONSTS.TopologyStatus.running);
        if (hits.length > 0) {
            async.series(
                [
                    ycallback => {
                        self.disableTopology(uuid, ycallback);
                    },
                    ycallback => {
                        self.sendMessageToWorker(
                            hits[0].worker, intf.CONSTS.LeaderMessages.kill_topology,
                            { uuid }, 30 * 1000, ycallback);
                    }
                ],
                callback
            );
        } else {
            callback();
        }
    }

    public deleteWorker(name: string, callback: intf.SimpleCallback) {
        const hits = this.workers.filter(x => x.name == name);
        if (hits.length > 0) {
            if (hits[0].status == intf.CONSTS.WorkerStatus.unloaded) {
                this.workers = this.workers.filter(x => x.name != name);
                callback();
            } else {
                callback(new Error("Specified worker is not unloaded and and cannot be deleted."));
            }
        } else {
            callback(new Error("Specified worker doesn't exist and thus cannot be deleted."));
        }
    }

    public shutDownWorker(name: string, callback: intf.SimpleCallback) {
        this.sendMessageToWorker(name, intf.CONSTS.LeaderMessages.shutdown, {}, 60 * 1000, callback);
    }

    public getTopologyHistory(uuid: string, callback: intf.SimpleResultCallback<intf.ITopologyStatusHistory[]>) {
        const data = this.topologies_history.filter(x => x.uuid == uuid);
        callback(null, JSON.parse(JSON.stringify(data)));
    }

    public getWorkerHistory(name: string, callback: intf.SimpleResultCallback<intf.IWorkerStatusHistory[]>) {
        const data = this.workers_history.filter(x => x.name == name);
        callback(null, JSON.parse(JSON.stringify(data)));
    }

    public setTopologyPid(uuid: string, pid: number, callback: intf.SimpleCallback) {
        const data = this.topologies.filter(x => x.uuid == uuid);
        if (data.length > 0) {
            data[0].pid = pid;
            this.notifyTopologyHistory(data[0]);
        }
        callback(null);
    }

    public pingWorker(name: string, callback?: intf.SimpleCallback) {
        for (const worker of this.workers) {
            if (worker.name == name) {
                worker.last_ping = Date.now();
                break;
            }
        }
        if (callback) {
            return callback();
        }
    }

    private unassignWaitingTopologies() {
        // set topologies to unassigned if they have been waiting too long
        const d = Date.now() - 30 * 1000;
        const worker_map: { [email: string]: string } = {};
        for (const worker of this.workers) {
            worker_map[worker.name] = worker.status;
        }
        for (const topology of this.topologies) {
            let change = false;
            if (topology.status == intf.CONSTS.TopologyStatus.waiting && topology.last_ping < d) {
                topology.status = intf.CONSTS.TopologyStatus.unassigned;
                topology.worker = null;
                change = true;
            }
            if (topology.worker) {
                if (worker_map[topology.worker] == intf.CONSTS.WorkerStatus.dead) {
                    topology.status = intf.CONSTS.TopologyStatus.unassigned;
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
        const d = Date.now() - 30 * 1000;
        for (const worker of this.workers) {
            if (
                worker.status == intf.CONSTS.WorkerStatus.alive &&
                worker.last_ping < d
            ) {
                worker.status = intf.CONSTS.WorkerStatus.dead;
                this.notifyWorkerHistory(worker);
            }
        }
    }

    private disableDefunctLeaders() {
        // disable worker that did not perform their leadership duties
        const d = Date.now() - 10 * 1000;
        for (const worker of this.workers) {
            if (
                worker.lstatus == intf.CONSTS.WorkerLStatus.leader ||
                worker.lstatus == intf.CONSTS.WorkerLStatus.candidate
            ) {
                if (worker.last_ping < d) {
                    worker.lstatus = intf.CONSTS.WorkerLStatus.normal;
                    this.notifyWorkerHistory(worker);
                }
            }
        }
    }

    private notifyTopologyHistory(top: TopologyRec) {
        this.topologies_history.push({
            enabled: top.enabled,
            error: top.error,
            last_ping: top.last_ping,
            last_ping_d: top.last_ping_d,
            pid: top.pid,
            status: top.status,
            ts: new Date(),
            uuid: top.uuid,
            weight: top.weight,
            worker: top.worker,
            worker_affinity: top.worker_affinity
        });
    }

    private notifyWorkerHistory(w: WorkerRec) {
        this.workers_history.push({
            lstatus: w.lstatus,
            name: w.name,
            pid: w.pid,
            status: w.status,
            ts: new Date()
        });
    }
}
