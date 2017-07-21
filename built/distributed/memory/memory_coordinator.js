"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//////////////////////////////////////////////////////////////////////
class MessageRec {
}
class TopologyRec {
}
/////////////////////////////////////////////////////////////////////
class MemoryCoordinator {
    constructor() {
        this.workers = [];
        this.topologies = [];
        this.messages = [];
    }
    getProperties(callback) {
        let res = [];
        res.push({ key: "type", value: "MemoryCoordinator" });
        callback(null, res);
    }
    getLeadershipStatus(callback) {
        this.disableDefunctLeaders();
        let res = "vacant";
        let leaders = this.workers.filter(x => x.lstatus == "leader").length;
        let pending = this.workers.filter(x => x.lstatus == "candidate").length;
        if (leaders > 0) {
            callback(null, { leadership: "ok" });
        }
        else if (pending > 0) {
            callback(null, { leadership: "pending" });
        }
        else {
            callback(null, { leadership: "vacant" });
        }
    }
    getWorkerStatus(callback) {
        this.disableDefunctWorkers();
        let res = this.workers
            .map(x => JSON.parse(JSON.stringify(x)));
        callback(null, res);
    }
    getTopologyStatus(callback) {
        this.unassignWaitingTopologies();
        this.disableDefunctWorkers();
        let res = this.topologies
            .map(x => JSON.parse(JSON.stringify(x)));
        callback(null, res);
    }
    getTopologiesForWorker(worker, callback) {
        this.unassignWaitingTopologies();
        let res = this.topologies
            .filter(x => x.worker == worker)
            .map(x => JSON.parse(JSON.stringify(x)));
        callback(null, res);
    }
    getMessages(name, callback) {
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
    getTopologyDefinition(uuid, callback) {
        let res = this.topologies
            .filter(x => x.uuid == uuid)
            .map(x => {
            return {
                config: x.config,
                current_worker: x.worker
            };
        });
        if (res.length == 0) {
            callback(new Error("Requested topology not found: " + uuid));
        }
        callback(null, res[0]);
    }
    registerWorker(name, callback) {
        let existing = this.workers.filter(x => x.name == name);
        if (existing.length == 0) {
            this.workers.push({
                last_ping: Date.now(),
                last_ping_d: new Date(),
                lstatus: "",
                lstatus_ts: Date.now(),
                lstatus_ts_d: new Date(),
                name: name,
                status: "alive"
            });
        }
        else {
            let w = existing[0];
            w.last_ping = Date.now();
            w.last_ping_d = new Date();
            w.lstatus = "";
            w.lstatus_ts = Date.now();
            w.lstatus_ts_d = new Date();
            w.status = "alive";
        }
        callback();
    }
    announceLeaderCandidacy(name, callback) {
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
                .forEach(x => { x.lstatus = "candidate"; });
        }
        callback();
    }
    checkLeaderCandidacy(name, callback) {
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
                .forEach(x => { x.lstatus = ""; });
            obj[0].lstatus = "leader";
            callback(null, true);
        }
        else if (obj[0].lstatus == "leader") {
            callback(null, true);
        }
        else {
            obj[0].lstatus = "";
            callback(null, false);
        }
    }
    assignTopology(uuid, worker, callback) {
        this.topologies
            .forEach(x => {
            if (x.uuid == uuid) {
                x.worker = worker;
            }
        });
        callback();
    }
    sendMessageToWorker(worker, cmd, content, callback) {
        this.messages.push({ cmd: cmd, name: worker, content: content });
        callback();
    }
    setTopologyStatus(uuid, status, error, callback) {
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => {
            x.status = status;
            x.error = error;
            x.last_ping = Date.now(); // this field only updates when status changes
        });
        callback();
    }
    setWorkerStatus(worker, status, callback) {
        this.workers
            .filter(x => x.name == worker)
            .forEach(x => { x.status = status; });
        callback();
    }
    registerTopology(uuid, config, callback) {
        let existing = this.topologies.filter(x => x.uuid == uuid);
        if (existing.length == 0) {
            this.topologies.push({
                enabled: false,
                config: config,
                status: "unassigned",
                uuid: uuid,
                weight: config.general.weight,
                worker: null,
                error: null,
                worker_affinity: config.general.worker_affinity,
                last_ping: Date.now()
            });
        }
        else {
            let t = existing[0];
            t.config = config;
            t.weight = config.general.weight;
            t.worker_affinity = config.general.worker_affinity;
            t.last_ping = Date.now();
        }
        callback();
    }
    disableTopology(uuid, callback) {
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => { x.enabled = false; });
        callback();
    }
    enableTopology(uuid, callback) {
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => { x.enabled = true; });
        callback();
    }
    deleteTopology(uuid, callback) {
        this.topologies = this.topologies
            .filter(x => x.uuid != uuid);
        callback();
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
            if (topology.status == "waiting" && topology.last_ping < d) {
                topology.status = "unassigned";
                topology.worker = null;
            }
            if (topology.worker) {
                if (worker_map[topology.worker] == "dead") {
                    topology.status = "unassigned";
                    topology.worker = null;
                }
            }
        }
    }
    disableDefunctWorkers() {
        // disable workers that did not update their status
        let d = Date.now() - 30 * 1000;
        for (let worker of this.workers) {
            if (worker.status == "alive" && worker.last_ping < d) {
                worker.status = "dead";
            }
        }
    }
    disableDefunctLeaders() {
        // disable worker that did not perform their leadership duties
        let d = Date.now() - 10 * 1000;
        for (let worker of this.workers) {
            if (worker.lstatus == "leader" || worker.lstatus == "candidate") {
                if (worker.last_ping < d) {
                    worker.lstatus = "";
                }
            }
        }
    }
}
exports.MemoryCoordinator = MemoryCoordinator;
//# sourceMappingURL=memory_coordinator.js.map