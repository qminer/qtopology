"use strict";

const port = 3000;
const Client = require('node-rest-client').Client;
const EventEmitter = require('events');

//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation

class SimpleCoordinator {

    constructor() {
        this._client = new Client();
        this._urlPrefix = "http://localhost:" + port + "/"
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
    getLeadershipStatus(name, callback) {
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
        this._call("set-topology-status", { uuid: name, status: status, error: error }, callback);
    }

    _call(addr, req_data, callback) {
        let self = this;
        let req = this._client.post(self._urlPrefix + addr, req_data, (data, response) => {
            callback(null, data);
        });
        req.on('error', (err) => {
            callback(err);
        });
    }
}

////////////////////////////////////////////////////////////////////

exports.SimpleCoordinator = SimpleCoordinator;
