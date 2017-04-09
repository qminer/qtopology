"use strict";

const port = 3000;
const Client = require('node-rest-client').Client;

//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation

class SimpleCoordinator {

    constructor() {
        this._client = new Client();
        this._urlPrefix = "http://localhost:" + port + "/"
    }

    getMessages(name, callback) {
        this._call("get-messages/" + name, callback);
    }

    registerWorker(name, callback) {
        this._call("register-worker/" + name, callback);
    }
    getLeadershipStatus(name, callback) {
        this._call("leadership-status/" + name, callback);
    }
    announceLeaderCandidacy(name, callback) {
        this._call("announce-leader-candidacy/" + name, callback);
    }
    checkLeaderCandidacy(name, callback) {
        this._call("check-leader-candidacy/" + name, callback);
    }
    getWorkerStatus(callback) {
        this._call("worker-statuses", callback);
    }
    getTopologyStatus(callback) {
        this._call("topology-statuses", callback);
    }
    getTopologiesForWorker(name, callback) {
        this._call("worker-topologies/" + name, callback);
    }
    assignTopology(uuid, name, callback) {
        this._call("assign-topology/" + uuid + "/" + name, callback);
    }

    _call(addr, callback) {
        let self = this;
        let self = this._client.get(self._urlPrefix + "get-messages/" + name, (data, response) => {
            callback(null, data);
        });
        req.on('error', (err) => {
            callback(err);
        });
    }
}

////////////////////////////////////////////////////////////////////

exports.SimpleCoordinator = SimpleCoordinator;
