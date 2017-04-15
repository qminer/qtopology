
const port_default = 3000;

import Client from 'node-rest-client';
import * as EventEmitter from 'events';
import * as intf from "../../topology_interfaces";

//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation

export class HttpCoordinator implements intf.CoordinationStorage {

    _port: number;
    _client: Client;
    _urlPrefix: string;

    constructor(port?: number) {
        this._port = port || port_default;
        this._client = new Client();
        this._urlPrefix = "http://localhost:" + this._port + "/"
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

    _call(addr: string, req_data: any, callback: intf.SimpleResultCallback<any>) {
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
