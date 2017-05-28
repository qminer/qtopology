
const port_default = 3000;

import * as nrc from 'node-rest-client';
import * as EventEmitter from 'events';
import * as intf from "../../topology_interfaces";

//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation

export class HttpCoordinator implements intf.CoordinationStorage {

    private port: number;
    private client: nrc.Client;
    private urlPrefix: string;

    constructor(port?: number) {
        this.port = port || port_default;
        this.client = new nrc.Client();
        this.urlPrefix = "http://localhost:" + this.port + "/"
    }

    getMessages(name: string, callback: intf.SimpleResultCallback<intf.StorageResultMessage[]>) {
        this.call("get-messages", { worker: name }, callback);
    }
    getWorkerStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultWorkerStatus[]>) {
        this.call("worker-statuses", {}, callback);
    }
    getTopologyStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>) {
        this.call("topology-statuses", {}, callback);
    }
    getTopologiesForWorker(name: string, callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>) {
        this.call("worker-topologies", { worker: name }, callback);
    }
    getLeadershipStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultStatus>) {
        this.call("leadership-status", {}, callback);
    }
    registerWorker(name: string, callback: intf.SimpleCallback) {
        this.call("register-worker", { worker: name }, callback);
    }
    announceLeaderCandidacy(name: string, callback: intf.SimpleCallback) {
        this.call("announce-leader-candidacy", { worker: name }, callback);
    }
    checkLeaderCandidacy(name: string, callback: intf.SimpleResultCallback<boolean>) {
        this.call("check-leader-candidacy", { worker: name }, callback);
    }
    assignTopology(uuid: string, name: string, callback: intf.SimpleCallback) {
        this.call("assign-topology", { worker: name, uuid: uuid }, callback);
    }
    setTopologyStatus(uuid: string, status: string, error: string, callback: intf.SimpleCallback) {
        this.call("set-topology-status", { uuid: uuid, status: status, error: error }, callback);
    }
    setWorkerStatus(name: string, status: string, callback: intf.SimpleCallback) {
        this.call("set-worker-status", { name: name, status: status }, callback);
    }

    registerTopology(uuid: string, config: any, overwrite: boolean, callback: intf.SimpleCallback) {
        callback(new Error("Operation not supported by this storage: registerTopology"));
    }
    disableTopology(uuid: string, callback: intf.SimpleCallback) {
        callback(new Error("Operation not supported by this storage: disableTopology"));
    }
    enableTopology(uuid: string, callback: intf.SimpleCallback) {
        callback(new Error("Operation not supported by this storage: enableTopology"));
    }
    deleteTopology(uuid: string, callback: intf.SimpleCallback) {
        callback(new Error("Operation not supported by this storage: deleteTopology"));
    }

    private call(addr: string, req_data: any, callback: intf.SimpleResultCallback<any>) {
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
