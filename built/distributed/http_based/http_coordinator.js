"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const port_default = 3000;
const nrc = require("node-rest-client");
//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation
class HttpCoordinator {
    constructor(port) {
        this.port = port || port_default;
        this.client = new nrc.Client();
        this.urlPrefix = "http://localhost:" + this.port + "/";
    }
    getMessages(name, callback) {
        this.call("get-messages", { worker: name }, callback);
    }
    getWorkerStatus(callback) {
        this.call("worker-statuses", {}, callback);
    }
    getTopologyStatus(callback) {
        this.call("topology-statuses", {}, callback);
    }
    getTopologiesForWorker(name, callback) {
        this.call("worker-topologies", { worker: name }, callback);
    }
    getTopologyDefinition(uuid, callback) {
        //callback(new Error("NOT IMPLEMENTED - getTopologyDefinition"));
        this.call("topology-definition", { uuid: uuid }, callback);
    }
    getLeadershipStatus(callback) {
        this.call("leadership-status", {}, callback);
    }
    registerWorker(name, callback) {
        this.call("register-worker", { worker: name }, callback);
    }
    announceLeaderCandidacy(name, callback) {
        this.call("announce-leader-candidacy", { worker: name }, callback);
    }
    checkLeaderCandidacy(name, callback) {
        this.call("check-leader-candidacy", { worker: name }, callback);
    }
    assignTopology(uuid, name, callback) {
        this.call("assign-topology", { worker: name, uuid: uuid }, callback);
    }
    setTopologyStatus(uuid, status, error, callback) {
        this.call("set-topology-status", { uuid: uuid, status: status, error: error }, callback);
    }
    setWorkerStatus(name, status, callback) {
        this.call("set-worker-status", { name: name, status: status }, callback);
    }
    registerTopology(uuid, config, callback) {
        this.call("register-topology", { uuid: uuid, config: config }, callback);
    }
    disableTopology(uuid, callback) {
        this.call("disable-topology", { uuid: uuid }, callback);
    }
    enableTopology(uuid, callback) {
        this.call("enable-topology", { uuid: uuid }, callback);
    }
    deleteTopology(uuid, callback) {
        this.call("delete-topology", { uuid: uuid }, callback);
    }
    call(addr, req_data, callback) {
        let self = this;
        let args = { data: req_data, headers: { "Content-Type": "application/json" } };
        let req = this.client.post(self.urlPrefix + addr, args, (data, response) => {
            callback(null, data);
        });
        req.on('error', (err) => {
            callback(err);
        });
    }
}
exports.HttpCoordinator = HttpCoordinator;
//# sourceMappingURL=http_coordinator.js.map