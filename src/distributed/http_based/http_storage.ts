
const port_default = 3000;

import * as nrc from "node-rest-client";
import * as intf from "../../topology_interfaces";

//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation

export class HttpStorage implements intf.ICoordinationStorage {

    private port: number;
    private client: nrc.Client;
    private url_prefix: string;

    constructor(port?: number) {
        this.port = port || port_default;
        this.client = new nrc.Client();
        this.url_prefix = "http://localhost:" + this.port + "/";
    }

    public getProperties(callback: intf.SimpleResultCallback<intf.IStorageProperty[]>) {
        const res = [];
        res.push({ key: "type", value: "HttpCoordinator" });
        res.push({ key: "port", value: this.port });
        res.push({ key: "url_prefix", value: this.url_prefix });
        callback(null, res);
    }

    public getMessages(name: string, callback: intf.SimpleResultCallback<intf.IStorageResultMessage[]>) {
        this.call("get-messages", { worker: name }, callback);
    }
    public getMessage(name: string, callback: intf.SimpleResultCallback<intf.IStorageResultMessage>) {
        this.call("get-message", { worker: name }, callback);
    }
    public getWorkerStatus(callback: intf.SimpleResultCallback<intf.IWorkerStatus[]>) {
        this.call("worker-statuses", {}, callback);
    }
    public getTopologyStatus(callback: intf.SimpleResultCallback<intf.ITopologyStatus[]>) {
        this.call("topology-statuses", {}, callback);
    }
    public getTopologiesForWorker(name: string, callback: intf.SimpleResultCallback<intf.ITopologyStatus[]>) {
        this.call("worker-topologies", { worker: name }, callback);
    }
    public getTopologyInfo(uuid: string, callback: intf.SimpleResultCallback<any>) {
        this.call("topology-info", { uuid }, callback);
    }
    public registerWorker(name: string, callback: intf.SimpleCallback) {
        this.call("register-worker", { worker: name }, callback);
    }
    public pingWorker(name: string, callback?: intf.SimpleCallback) {
        this.call("ping-worker", { worker: name }, callback);
    }
    public announceLeaderCandidacy(name: string, callback: intf.SimpleCallback) {
        this.call("announce-leader-candidacy", { worker: name }, callback);
    }
    public checkLeaderCandidacy(name: string, callback: intf.SimpleResultCallback<boolean>) {
        this.call("check-leader-candidacy", { name }, callback);
    }
    public assignTopology(uuid: string, name: string, callback: intf.SimpleCallback) {
        this.call("assign-topology", { name, uuid }, callback);
    }
    public sendMessageToWorker(
        worker: string, cmd: string, content: any, valid_msec: number,
        callback: intf.SimpleCallback
    ) {
        this.call("send-message", { worker, cmd, content, valid_msec }, callback);
    }

    public setTopologyStatus(
        uuid: string, worker: string, status: string, error: string,
        callback: intf.SimpleCallback
    ) {
        this.call("set-topology-status", { uuid, status, error, worker }, callback);
    }
    public getMsgQueueContent(callback: intf.SimpleResultCallback<intf.IMsgQueueItem[]>) {
        this.call("get-msg-queue-content", {}, callback);
    }
    public setWorkerStatus(name: string, status: string, callback: intf.SimpleCallback) {
        this.call("set-worker-status", { name, status }, callback);
    }
    public setWorkerLStatus(name: string, lstatus: string, callback: intf.SimpleCallback) {
        this.call("set-worker-lstatus", { name, lstatus }, callback);
    }
    public setTopologyPid(uuid: string, pid: number, callback: intf.SimpleCallback) {
        this.call("set-topology-pid", { uuid, pid }, callback);
    }

    public registerTopology(uuid: string, config: any, callback: intf.SimpleCallback) {
        this.call("register-topology", { uuid, config }, callback);
    }
    public disableTopology(uuid: string, callback: intf.SimpleCallback) {
        this.call("disable-topology", { uuid }, callback);
    }
    public enableTopology(uuid: string, callback: intf.SimpleCallback) {
        this.call("enable-topology", { uuid }, callback);
    }
    public deleteTopology(uuid: string, callback: intf.SimpleCallback) {
        this.call("delete-topology", { uuid }, callback);
    }
    public clearTopologyError(uuid: string, callback: intf.SimpleCallback) {
        this.call("clear-topology-error", { uuid }, callback);
    }
    public stopTopology(uuid: string, callback: intf.SimpleCallback) {
        this.call("stop-topology", { uuid }, callback);
    }
    public killTopology(uuid: string, callback: intf.SimpleCallback) {
        this.call("kill-topology", { uuid }, callback);
    }
    public deleteWorker(name: string, callback: intf.SimpleCallback) {
        this.call("delete-worker", { name }, callback);
    }
    public shutDownWorker(name: string, callback: intf.SimpleCallback) {
        this.call("shut-down-worker", { name }, callback);
    }
    public getTopologyHistory(uuid: string, callback: intf.SimpleResultCallback<intf.ITopologyStatusHistory[]>) {
        this.call("topology-history", { uuid }, callback);
    }
    public getWorkerHistory(name: string, callback: intf.SimpleResultCallback<intf.IWorkerStatusHistory[]>) {
        this.call("worker-history", { name }, callback);
    }


    private call(addr: string, req_data: any, callback: intf.SimpleResultCallback<any>) {
        const self = this;
        const args = { data: req_data, headers: { "Content-Type": "application/json" } };
        const req = this.client.post(self.url_prefix + addr, args, (data, response) => {
            callback(null, data);
        });
        req.on("error", err => {
            callback(err);
        });
    }
}
