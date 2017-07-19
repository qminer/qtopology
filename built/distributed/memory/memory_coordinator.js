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
    getLeadershipStatus(callback) {
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
        let res = this.workers
            .map(x => JSON.parse(JSON.stringify(x)));
        callback(null, res);
    }
    getTopologyStatus(callback) {
        let res = this.topologies
            .map(x => JSON.parse(JSON.stringify(x)));
        callback(null, res);
    }
    getTopologiesForWorker(worker, callback) {
        let res = this.topologies
            .filter(x => x.worker == worker)
            .map(x => JSON.parse(JSON.stringify(x)));
        callback(null, res);
    }
    getMessages(name, callback) {
        let res = this.messages
            .filter(x => x.name == name)
            .map(x => { return { cmd: x.cmd, content: x.content }; });
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
    announceLeaderCandidacy(name, callback) {
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
            .filter(x => x.uuid == uuid)
            .forEach(x => { x.worker = worker; });
        callback();
    }
    setTopologyStatus(uuid, status, error, callback) {
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => { x.status = status; });
        callback();
    }
    setWorkerStatus(worker, status, callback) {
        this.workers
            .filter(x => x.name == worker)
            .forEach(x => { x.status = status; });
        callback();
    }
    registerTopology(uuid, config, callback) {
        this.topologies.push({
            enabled: false,
            config: config,
            status: "unassigned",
            uuid: uuid,
            weight: config.general.weight,
            worker: null,
            worker_affinity: config.general.worker_affinity
        });
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
}
exports.MemoryCoordinator = MemoryCoordinator;
//# sourceMappingURL=memory_coordinator.js.map