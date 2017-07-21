import * as hs from "../../util/http_server";
import * as intf from "../../topology_interfaces";

class RecWorker {
    name: string;
    last_ping: number;
    status: string;
    lstatus: string;
    lstatus_ts: number;
}
class RecTopology {
    uuid: string;
    config: any;
    status: string;
    worker: string;
    last_ping: number;
    error: string;
    enabled: boolean;
}
class RecMessage {
    worker: string;
    cmd: string;
    content: any;
}

//////////////////////////////////////////////////////////////////////
// Storage implementation - accessed over HTTP
//
// Broad schema:
// Workers: uuid, title, last_ping, status, lstatus
// Topologies: uuid, config, status, worker
// Msgs: worker, cmd, content
//
// Worker status: alive, dead, unloaded
// worker lstatus: leader, candidate, ""
// Topology status: unassigned, waiting, running, error, stopped

class HttpCoordinationStorage {

    private workers: RecWorker[];
    private topologies: RecTopology[];
    private messages: RecMessage[];

    constructor() {
        this.workers = [];
        this.topologies = [];
        this.messages = [];
    }

    addTopology(uuid: string, config: any) {
        this.topologies.push({
            uuid: uuid,
            config: config,
            status: "unassigned",
            worker: null,
            last_ping: Date.now(),
            error: null,
            enabled: true
        });
    }
    removeTopology(uuid: string) {
        this.topologies = this.topologies.filter(x => x.uuid != uuid);
    }
    getTopologyDefinition(uuid: string): any {
        let targets = this.topologies.filter(x => x.uuid == uuid);
        if (targets.length == 0) return { config: null };
        return targets[0].config;
    }
    enableTopology(uuid: string) {
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => { x.enabled = true; });
    }
    disableTopology(uuid: string) {
        this.topologies
            .filter(x => x.uuid == uuid)
            .forEach(x => { x.enabled = false; });
    }

    /** Performs upsert of worker record. It's initial status is alive */
    registerWorker(name: string) {
        let rec = null;
        for (let worker of this.workers) {
            if (worker.name == name) {
                rec = worker;
                worker.last_ping = Date.now();
                worker.status = "alive";
                worker.lstatus = "";
                worker.lstatus_ts = null;
                break;
            }
        }
        if (!rec) {
            rec = {
                name: name,
                last_ping: Date.now(),
                status: "alive",
                lstatus: "",
                lstatus_ts: null
            };
            this.workers.push(rec);
        }
        return { success: true };
    }

    /** Determines leadership status */
    getLeadershipStatus(): intf.LeadershipResultStatus {
        this.disableDefunctLeaders();

        let hits = this.workers.filter(x => x.lstatus == "leader");
        if (hits.length > 0) return { leadership: "ok" };

        hits = this.workers.filter(x => x.lstatus == "candidate");
        if (hits.length > 0) return { leadership: "pending" };

        return { leadership: "vacant" };
    }

    announceLeaderCandidacy(name: string) {
        this.disableDefunctLeaders();

        // if we already have a leader, abort
        let hits = this.workers.filter(x => x.lstatus == "leader");
        if (hits.length > 0) return;

        // find pending records that are not older than 5 sec
        hits = this.workers.filter(x => x.lstatus == "pending");
        if (hits.length > 0) return;

        // ok, announce new candidate
        for (let worker of this.workers) {
            if (worker.name == name) {
                worker.lstatus = "pending";
                worker.lstatus_ts = Date.now();
                break;
            }
        }
        return;
    }

    /** Checks if leadership candidacy for specified worker was successful. */
    checkLeaderCandidacy(name: string): boolean {
        this.disableDefunctLeaders();

        let res = false;
        for (let worker of this.workers) {
            if (worker.name == name && worker.lstatus == "pending") {
                worker.lstatus = "leader";
                res = true;
                break;
            }
        }
        return res;
    }

    /** Returns worker statuses */
    getWorkerStatuses(): intf.LeadershipResultWorkerStatus[] {
        this.disableDefunctWorkers();
        return this.workers
            .map(x => {
                let cnt = 0;
                this.topologies.forEach(y => {
                    cnt += (y.worker === x.name ? 1 : 0);
                });
                return {
                    name: x.name,
                    status: x.status,
                    topology_count: cnt,
                    lstatus: x.lstatus,
                    last_ping: x.last_ping,
                    last_ping_d: new Date(x.last_ping),
                    lstatus_ts: x.lstatus_ts,
                    lstatus_ts_d: new Date(x.lstatus_ts)
                };
            });
    }

    getTopologyStatuses(): intf.LeadershipResultTopologyStatus[] {
        this.disableDefunctWorkers();
        this.unassignWaitingTopologies();
        return this.topologies
            .map(x => {
                return {
                    uuid: x.uuid,
                    status: x.status,
                    worker: x.worker,
                    weight: 1,
                    worker_affinity: [],
                    enabled: x.enabled
                };
            });
    }

    getTopologiesForWorker(name: string): intf.LeadershipResultTopologyStatus[] {
        return this.topologies
            .filter(x => x.worker === name)
            .map(x => {
                return {
                    uuid: x.uuid,
                    status: x.status,
                    worker: x.worker,
                    weight: 1,
                    worker_affinity: [],
                    enabled: x.enabled
                };
            });
    }

    assignTopology(uuid: string, target: string) {
        let topology = this.topologies.filter(x => x.uuid == uuid)[0];
        this.messages.push({
            worker: target,
            cmd: "start",
            content: {
                uuid: uuid,
                config: topology.config
            }
        });
        topology.status = "waiting";
        topology.worker = target;
    }

    markTopologyAsRunning(uuid: string) {
        let topology = this.topologies.filter(x => x.uuid == uuid)[0];
        topology.status = "running";
        topology.last_ping = Date.now();
    }

    markTopologyAsStopped(uuid: string) {
        let topology = this.topologies.filter(x => x.uuid == uuid)[0];
        topology.status = "stopped";
        topology.last_ping = Date.now();
    }

    markTopologyAsError(uuid: string, error: string) {
        let topology = this.topologies.filter(x => x.uuid == uuid)[0];
        topology.status = "error";
        topology.last_ping = Date.now();
        topology.error = error;
    }

    setTopologyStatus(uuid: string, status: string, error: string) {
        if (status == "running") return this.markTopologyAsRunning(uuid);
        if (status == "stopped") return this.markTopologyAsStopped(uuid);
        if (status == "unassigned") return this.markTopologyAsStopped(uuid);
        if (status == "error") return this.markTopologyAsError(uuid, error);
        return {
            success: false,
            error: `Unknown topology status: "${status}", uuid: "${uuid}"`
        };
    }

    setWorkerStatus(name: string, status: string) {
        let hits = this.workers.filter(x => x.name === name);
        if (hits.length > 0) {
            hits[0].status = status;
            if (status !== "alive") {
                hits[0].lstatus = "";
            }
            return { success: true };
        } else {
            return { success: false, error: "Unknown worker: " + name };
        }
    }

    getMessagesForWorker(name: string) {
        this.pingWorker(name);
        let result = this.messages.filter(x => x.worker === name);
        this.messages = this.messages.filter(x => x.worker !== name);
        return result.map(x => {
            return {
                cmd: x.cmd,
                content: x.content,
                worker: x.worker
            }
        });
    }

    private pingWorker(name: string) {
        for (let worker of this.workers) {
            if (worker.name == name) {
                worker.last_ping = Date.now();
                break;
            }
        }
    }

    private unassignWaitingTopologies() {
        // set topologies to unassigned if they have been waiting too long
        let d = Date.now() - 30 * 1000;
        let worker_map: { [email: string]: string } = {};
        for (let worker of this.workers) {
            worker_map[worker.name] = worker.status;
        }
        for (let topology of this.topologies) {
            if (topology.status == "waiting" && topology.last_ping < d) {
                topology.status = "unassigned";
                topology.worker = null;
            }
            if (topology.worker) {
                if (worker_map[topology.worker] == "dead") {
                    topology.status = "unassigned";
                    topology.worker = null;
                }
            }
        }
    }

    private disableDefunctWorkers() {
        // disable workers that did not update their status
        let d = Date.now() - 30 * 1000;
        for (let worker of this.workers) {
            if (worker.status == "alive" && worker.last_ping < d) {
                worker.status = "dead";
            }
        }
    }

    private disableDefunctLeaders() {
        // disable worker that did not perform their leadership duties
        let d = Date.now() - 10 * 1000;
        for (let worker of this.workers) {
            if (worker.lstatus == "leader" || worker.lstatus == "candidate") {
                if (worker.last_ping < d) {
                    worker.lstatus = "";
                }
            }
        }
    }
}

////////////////////////////////////////////////////////////////////
// Initialize simple REST server

function initHttpServer(storage: HttpCoordinationStorage): hs.MinimalHttpServer {
    let http_server = new hs.MinimalHttpServer();
    http_server.addHandler('/worker-statuses', (data, callback) => {
        let result = storage.getWorkerStatuses();
        callback(null, result);
    });
    http_server.addHandler('/topology-statuses', (data, callback) => {
        let result = storage.getTopologyStatuses();
        callback(null, result);
    });
    http_server.addHandler('/leadership-status', (data, callback) => {
        let result = storage.getLeadershipStatus();
        callback(null, result);
    });
    http_server.addHandler('/worker-topologies', (data, callback) => {
        let worker = data.worker;
        let result = storage.getTopologiesForWorker(worker);
        callback(null, result);
    });
    http_server.addHandler('/get-messages', (data, callback) => {
        let worker = data.worker;
        let result = storage.getMessagesForWorker(worker);
        callback(null, result);
    });
    http_server.addHandler('/assign-topology', (data, callback) => {
        let worker = data.worker;
        let uuid = data.uuid;
        let result = storage.assignTopology(uuid, worker);
        callback(null, result);
    });
    http_server.addHandler('/check-leader-candidacy', (data, callback) => {
        let worker = data.worker;
        let result = storage.checkLeaderCandidacy(worker);
        callback(null, result);
    });
    http_server.addHandler('/announce-leader-candidacy', (data, callback) => {
        let worker = data.worker;
        let result = storage.announceLeaderCandidacy(worker);
        callback(null, result);
    });
    http_server.addHandler('/register-worker', (data, callback) => {
        let worker = data.worker;
        let result = storage.registerWorker(worker);
        callback(null, result);
    });
    http_server.addHandler('/set-topology-status', (data, callback) => {
        let uuid = data.uuid;
        let status = data.status;
        let error = data.error;
        let result = storage.setTopologyStatus(uuid, status, error);
        callback(null, result);
    });
    http_server.addHandler('/set-worker-status', (data, callback) => {
        let name = data.name;
        let status = data.status;
        let result = storage.setWorkerStatus(name, status);
        callback(null, result);
    });

    http_server.addHandler('/register-topology', (data, callback) => {
        let result = storage.addTopology(data.uuid, data.config);
        callback(null, result);
    });
    http_server.addHandler('/disable-topology', (data, callback) => {
        let result = storage.disableTopology(data.config);
        callback(null, result);
    });
    http_server.addHandler('/enable-topology', (data, callback) => {
        let result = storage.enableTopology(data.config);
        callback(null, result);
    });
    http_server.addHandler('/delete-topology', (data, callback) => {
        let result = storage.removeTopology(data.config);
        callback(null, result);
    });
    http_server.addHandler('/topology-definition', (data, callback) => {
        let result = storage.getTopologyDefinition(data.uuid);
        callback(null, result);
    });
    return http_server;
}

/////////////////////////////////////////////////////////////////////////////

export function runHttpServer(options: any) {
    let storage = new HttpCoordinationStorage();
    let http_server = initHttpServer(storage);
    http_server.run(options);
}
