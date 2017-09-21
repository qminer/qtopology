
const port_default = 3000;

import * as nrc from 'node-rest-client';
import * as EventEmitter from 'events';
import * as intf from "../../topology_interfaces";

//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation

export class HttpStorage implements intf.CoordinationStorage {

    private port: number;
    private client: nrc.Client;
    private url_prefix: string;

    constructor(port?: number) {
        this.port = port || port_default;
        this.client = new nrc.Client();
        this.url_prefix = "http://localhost:" + this.port + "/"
    }

    getProperties(callback: intf.SimpleResultCallback<intf.StorageProperty[]>) {
        let res = [];
        res.push({ key: "type", value: "HttpCoordinator" });
        res.push({ key: "port", value: this.port });
        res.push({ key: "url_prefix", value: this.url_prefix });
        callback(null, res);
    }

    getMessages(name: string, callback: intf.SimpleResultCallback<intf.StorageResultMessage[]>) {
        this.call("get-messages", { worker: name }, callback);
    }
    getWorkerStatus(callback: intf.SimpleResultCallback<intf.WorkerStatus[]>) {
        this.call("worker-statuses", {}, callback);
    }
    getTopologyStatus(callback: intf.SimpleResultCallback<intf.TopologyStatus[]>) {
        this.call("topology-statuses", {}, callback);
    }
    getTopologiesForWorker(name: string, callback: intf.SimpleResultCallback<intf.TopologyStatus[]>) {
        this.call("worker-topologies", { worker: name }, callback);
    }
    getTopologyInfo(uuid: string, callback: intf.SimpleResultCallback<any>) {
        this.call("topology-info", { uuid: uuid }, callback);
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
    sendMessageToWorker(worker: string, cmd: string, content: any, callback: intf.SimpleCallback) {
        this.call("send-message", { worker: worker, cmd: cmd, content: content }, callback);
    }

    setTopologyStatus(uuid: string, status: string, error: string, callback: intf.SimpleCallback) {
        this.call("set-topology-status", { uuid: uuid, status: status, error: error }, callback);
    }
    setWorkerStatus(name: string, status: string, callback: intf.SimpleCallback) {
        this.call("set-worker-status", { name: name, status: status }, callback);
    }

    registerTopology(uuid: string, config: any, callback: intf.SimpleCallback) {
        this.call("register-topology", { uuid: uuid, config: config }, callback);
    }
    disableTopology(uuid: string, callback: intf.SimpleCallback) {
        this.call("disable-topology", { uuid: uuid }, callback);
    }
    enableTopology(uuid: string, callback: intf.SimpleCallback) {
        this.call("enable-topology", { uuid: uuid }, callback);
    }
    deleteTopology(uuid: string, callback: intf.SimpleCallback) {
        this.call("delete-topology", { uuid: uuid }, callback);
    }
    clearTopologyError(uuid: string, callback: intf.SimpleCallback) {
        this.call("clear-topology-error", { uuid: uuid }, callback);
    }
    stopTopology(uuid: string, callback: intf.SimpleCallback) {
        this.call("stop-topology", { uuid: uuid }, callback);
    }
    deleteWorker(name: string, callback: intf.SimpleCallback) {
        this.call("delete-worker", { name: name }, callback);
    }
    shutDownWorker(name: string, callback: intf.SimpleCallback) {
        this.call("shut-down-worker", { name: name }, callback);
    }
    getTopologyHistory(uuid: string, callback: intf.SimpleResultCallback<intf.TopologyStatusHistory[]>) {
        this.call("topology-history", { uuid: uuid }, callback);
    }
    getWorkerHistory(name: string, callback: intf.SimpleResultCallback<intf.WorkerStatusHistory[]>) {
        this.call("worker-history", { name: name }, callback);
    }


    private call(addr: string, req_data: any, callback: intf.SimpleResultCallback<any>) {
        let self = this;
        let args = { data: req_data, headers: { "Content-Type": "application/json" } };
        let req = this.client.post(self.url_prefix + addr, args, (data, response) => {
            callback(null, data);
        });
        req.on('error', (err) => {
            callback(err);
        });
    }
}
