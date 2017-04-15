"use strict";
const port = 3000;
const Client = require('node-rest-client').Client;
const EventEmitter = require('events');
//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation
class HttpCoordinator {
    constructor(options) {
        options = options || {};
        this._port = options.port || port;
        this._client = new Client();
        this._urlPrefix = "http://localhost:" + this._port + "/";
    }
    getMessages(name, callback) {
        this._call("get-messages", { worker: name }, callback);
    }
    getWorkerStatus(callback) {
        this._call("worker-statuses", {}, callback);
    }
    getTopologyStatus(callback) {
        this._call("topology-statuses", {}, callback);
    }
    getTopologiesForWorker(name, callback) {
        this._call("worker-topologies", { worker: name }, callback);
    }
    getLeadershipStatus(callback) {
        this._call("leadership-status", {}, callback);
    }
    registerWorker(name, callback) {
        this._call("register-worker", { worker: name }, callback);
    }
    announceLeaderCandidacy(name, callback) {
        this._call("announce-leader-candidacy", { worker: name }, callback);
    }
    checkLeaderCandidacy(name, callback) {
        this._call("check-leader-candidacy", { worker: name }, callback);
    }
    assignTopology(uuid, name, callback) {
        this._call("assign-topology", { worker: name, uuid: uuid }, callback);
    }
    setTopologyStatus(uuid, status, error, callback) {
        this._call("set-topology-status", { uuid: uuid, status: status, error: error }, callback);
    }
    setWorkerStatus(name, status, callback) {
        this._call("set-worker-status", { name: name, status: status }, callback);
    }
    _call(addr, req_data, callback) {
        let self = this;
        let args = { data: req_data, headers: { "Content-Type": "application/json" } };
        let req = this._client.post(self._urlPrefix + addr, args, (data, response) => {
            callback(null, data);
        });
        req.on('error', (err) => {
            callback(err);
        });
    }
}
////////////////////////////////////////////////////////////////////
exports.HttpCoordinator = HttpCoordinator;
