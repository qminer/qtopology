import * as hs from "../../util/http_server";
import * as intf from "../../topology_interfaces";
import * as mem from "../memory/memory_coordinator";

////////////////////////////////////////////////////////////////////
// Initialize simple REST server

function initHttpServer(storage: intf.CoordinationStorage): hs.MinimalHttpServer {
    let http_server = new hs.MinimalHttpServer();
    http_server.addHandler('/worker-statuses', (data, callback) => {
        storage.getWorkerStatus(callback);
    });
    http_server.addHandler('/topology-statuses', (data, callback) => {
        storage.getTopologyStatus(callback);
    });
    http_server.addHandler('/leadership-status', (data, callback) => {
        storage.getLeadershipStatus(callback);
    });
    http_server.addHandler('/worker-topologies', (data, callback) => {
        let worker = data.worker;
        storage.getTopologiesForWorker(worker, callback);
    });
    http_server.addHandler('/get-messages', (data, callback) => {
        let worker = data.worker;
        storage.getMessages(worker, callback);
    });
    http_server.addHandler('/assign-topology', (data, callback) => {
        let worker = data.worker;
        let uuid = data.uuid;
        storage.assignTopology(uuid, worker, callback);
    });
    http_server.addHandler('/check-leader-candidacy', (data, callback) => {
        let worker = data.worker;
        storage.checkLeaderCandidacy(worker, callback);
    });
    http_server.addHandler('/announce-leader-candidacy', (data, callback) => {
        let worker = data.worker;
        storage.announceLeaderCandidacy(worker, callback);
    });
    http_server.addHandler('/register-worker', (data, callback) => {
        let worker = data.worker;
        storage.registerWorker(worker, callback);
    });
    http_server.addHandler('/set-topology-status', (data, callback) => {
        let uuid = data.uuid;
        let status = data.status;
        let error = data.error;
        storage.setTopologyStatus(uuid, status, error, callback);
    });
    http_server.addHandler('/set-worker-status', (data, callback) => {
        let name = data.name;
        let status = data.status;
        storage.setWorkerStatus(name, status, callback);
    });
    http_server.addHandler('/send-message', (data, callback) => {
        let worker = data.worker;
        let cmd = data.cmd;
        let content = data.content
        storage.sendMessageToWorker(worker, cmd, content, callback);
    });

    http_server.addHandler('/register-topology', (data, callback) => {
        let result = storage.registerTopology(data.uuid, data.config, callback);
    });
    http_server.addHandler('/disable-topology', (data, callback) => {
        storage.disableTopology(data.uuid, callback);
    });
    http_server.addHandler('/enable-topology', (data, callback) => {
        storage.enableTopology(data.uuid, callback);
    });
    http_server.addHandler('/delete-topology', (data, callback) => {
        storage.deleteTopology(data.uuid, callback);
    });
    http_server.addHandler('/clear-topology-error', (data, callback) => {
        storage.clearTopologyError(data.uuid, callback);
    });
    http_server.addHandler('/topology-definition', (data, callback) => {
        storage.getTopologyDefinition(data.uuid, callback);
    });
    return http_server;
}

/////////////////////////////////////////////////////////////////////////////

export function runHttpServer(options: any) {
    let storage = new mem.MemoryCoordinator();
    let http_server = initHttpServer(storage);
    http_server.run(options);
}
