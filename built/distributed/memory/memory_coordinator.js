"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const intf = require("../../topology_interfaces");
const async = require("async");
//////////////////////////////////////////////////////////////////////
class MessageRec {
}
class TopologyRec {
}
class WorkerRec {
}
/////////////////////////////////////////////////////////////////////
class MemoryCoordinator {
    constructor() {
        this.workers = [];
        this.topologies = [];
        this.workers_history = [];
        this.topologies_history = [];
        this.messages = [];
    }
    getProperties(callback) {
        let res = [];
        res.push({ key: "type", value: "MemoryCoordinator" });
        res.push({ key: "pending-messages", value: this.messages.length });
        callback(null, res);
    }
    getLeadershipStatus(callback) {
        this.disableDefunctLeaders();
        let res = intf.Consts.LeadershipStatus.vacant;
        let leaders = this.workers.filter(x => x.lstatus == intf.Consts.WorkerLStatus.leader).length;
        let pending = this.workers.filter(x => x.lstatus == intf.Consts.WorkerLStatus.candidate).length;
        if (leaders > 0) {
            callback(null, { leadership: intf.Consts.LeadershipStatus.ok });
        }
        else if (pending > 0) {
            callback(null, { leadership: intf.Consts.LeadershipStatus.pending });
        }
        else {
            callback(null, { leadership: intf.Consts.LeadershipStatus.vacant });
        }
    }
    getWorkerStatus(callback) {
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
    getTopologyStatus(callback) {
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
    getTopologiesForWorker(worker, callback) {
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
    getMessages(name, callback) {
        this.pingWorker(name);
        let res = this.messages
            .filter(x => x.name == name)
            .map(x => { return { cmd: x.cmd, content: x.content, created: x.created }; });
        if (res.length > 0) {
            this.messages = this.messages
                .filter(x => x.name != name);
        }
        callback(null, res);
    }
    getTopologyInfo(uuid, callback) {
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
    registerWorker(name, callback) {
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
        }
        else {
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
    announceLeaderCandidacy(name, callback) {
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
    checkLeaderCandidacy(name, callback) {
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
        }
        else if (obj[0].lstatus == intf.Consts.WorkerLStatus.leader) {
            callback(null, true);
        }
        else {
            obj[0].lstatus = intf.Consts.WorkerLStatus.normal;
            this.notifyWorkerHistory(obj[0]);
            callback(null, false);
        }
    }
    assignTopology(uuid, worker, callback) {
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
    sendMessageToWorker(worker, cmd, content, callback) {
        this.messages.push({ cmd: cmd, name: worker, content: content, created: new Date() });
        callback();
    }
    setTopologyStatus(uuid, status, error, callback) {
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
    setWorkerStatus(worker, status, callback) {
        let self = this;
        this.workers
            .filter(x => x.name == worker)
            .forEach(x => {
            x.status = status;
            self.notifyWorkerHistory(x);
        });
        callback();
    }
    registerTopology(uuid, config, callback) {
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
            };
            this.topologies.push(t);
        }
        else {
            t = existing[0];
            t.config = config;
            t.weight = config.general.weight;
            t.worker_affinity = config.general.worker_affinity;
            t.last_ping = Date.now();
        }
        this.notifyTopologyHistory(t);
        callback();
    }
    disableTopology(uuid, callback) {
        let self = this;
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => {
            x.enabled = false;
            self.notifyTopologyHistory(x);
        });
        callback();
    }
    enableTopology(uuid, callback) {
        let self = this;
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => {
            x.enabled = true;
            self.notifyTopologyHistory(x);
        });
        callback();
    }
    deleteTopology(uuid, callback) {
        this.topologies = this.topologies
            .filter(x => x.uuid != uuid);
        callback();
    }
    stopTopology(uuid, callback) {
        let self = this;
        let hits = self.topologies
            .filter(x => x.uuid == uuid && x.status == intf.Consts.TopologyStatus.running);
        if (hits.length > 0) {
            async.series([
                (ycallback) => {
                    self.disableTopology(uuid, ycallback);
                },
                (ycallback) => {
                    self.sendMessageToWorker(hits[0].worker, intf.Consts.LeaderMessages.stop_topology, { uuid: uuid }, ycallback);
                }
            ], callback);
        }
        else {
            callback();
        }
    }
    clearTopologyError(uuid, callback) {
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
    deleteWorker(name, callback) {
        let hits = this.workers.filter(x => x.name == name);
        if (hits.length > 0) {
            if (hits[0].status == intf.Consts.WorkerStatus.unloaded) {
                this.workers = this.workers.filter(x => x.name != name);
                callback();
            }
            else {
                callback(new Error("Specified worker is not unloaded and and cannot be deleted."));
            }
        }
        else {
            callback(new Error("Specified worker doesn't exist and thus cannot be deleted."));
        }
    }
    shutDownWorker(name, callback) {
        this.sendMessageToWorker(name, intf.Consts.LeaderMessages.shutdown, {}, callback);
    }
    getTopologyHistory(uuid, callback) {
        let data = this.topologies_history.filter(x => x.uuid == uuid);
        callback(null, JSON.parse(JSON.stringify(data)));
    }
    getWorkerHistory(name, callback) {
        let data = this.workers_history.filter(x => x.name == name);
        callback(null, JSON.parse(JSON.stringify(data)));
    }
    pingWorker(name) {
        for (let worker of this.workers) {
            if (worker.name == name) {
                worker.last_ping = Date.now();
                break;
            }
        }
    }
    unassignWaitingTopologies() {
        // set topologies to unassigned if they have been waiting too long
        let d = Date.now() - 30 * 1000;
        let worker_map = {};
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
    disableDefunctWorkers() {
        // disable workers that did not update their status
        let d = Date.now() - 30 * 1000;
        for (let worker of this.workers) {
            if (worker.status == intf.Consts.WorkerStatus.alive && worker.last_ping < d) {
                worker.status = intf.Consts.WorkerStatus.dead;
                this.notifyWorkerHistory(worker);
            }
        }
    }
    disableDefunctLeaders() {
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
    notifyTopologyHistory(top) {
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
    notifyWorkerHistory(w) {
        this.workers_history.push({
            lstatus: w.lstatus,
            name: w.name,
            status: w.status,
            ts: new Date()
        });
    }
}
exports.MemoryCoordinator = MemoryCoordinator;
//# sourceMappingURL=memory_coordinator.js.map