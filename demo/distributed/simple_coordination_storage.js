"use strict";

// content of index.js
const http = require('http');
const port = 3000;

class SimpleCoordinationStorage {

    constructor() {
        this._workers = [];
        this._topologies = [];
        this._messages = [];
    }

    registerWorker(name) {
        for (let worker of this._workers) {
            if (worker.name == name) {
                worker.last_ping = Date.now();
                worker.status = "inactive";
                worker.lstatus = "";
                worker.lstatus_ts = null;
                return;
            }
        }
        this._workers.push({
            name: name,
            last_ping: Date.now(),
            status: "inactive",
            lstatus: "",
            lstatus_ts: null
        });
    }

    getLeadershipStatus() {
        this._disableDefunctLeaders();

        let hits = this._workers.filter(x => x.lstatus == "leader");
        if (hits.length > 0) return "ok";

        hits = this._workers.filter(x => x.lstatus == "candidate");
        if (hits.length > 0) return "pending";

        return "vacant";
    }

    announceLeaderCandidacy(name) {
        this._disableDefunctLeaders();

        // if we already have a leader, abort
        let hits = this._workers.filter(x => x.lstatus == "leader");
        if (hits.length > 0) return;

        // find pending records that are not older than 5 sec
        hits = this._workers.filter(x => x.lstatus == "pending");
        if (hits.length > 0) return;

        // ok, announce new candidate
        for (let worker of this._workers) {
            if (worker.name == name) {
                worker.lstatus = "pending";
                worker.lstatus_ts = Date.now();
                return;
            }
        }
    }

    checkLeaderCandidacy(name) {
        this._disableDefunctLeaders();
        for (let worker of this._workers) {
            if (worker.name == name && worker.lstatus == "pending") {
                worker.lstatus = "leader";
                return true;
            }
        }
        return false;
    }

    getWorkerStatus() {
        return this._workers
            .map(x => {
                let cnt = 0;
                this._topologies.forEach(y => {
                    cnt += (y.worker === x.name ? 1 : 0);
                });
                return { name: x.name, status: x.status, topology_count: cnt };
            });
    }
    getTopologiesForWorker(name) {
        // TODO
    }
    reassignTopology(uuid, target) {
        // TODO
    }

    getMessages(name) {
        // TODO
    }

    _disableDefunctWorkers() {
        // disable workers that did not perform their status
        let d = Date.now() - 30 * 1000;
        for (let worker in this._workers) {
            if (worker.status == "alive" && worker.last_ping < d) {
                worker.status = "dead";
            }
        }
    }

    _disableDefunctLeaders() {
        // disable worker that did not perform their leadership duties
        let d = Date.now() - 10 * 1000;
        for (let worker in this._workers) {
            if (worker.lstatus == "leader" && worker.lstatus == "candidate") {
                if (worker.last_ping < d) {
                    worker.lstatus = "";
                }
            }
        }
    }
}
let storage = new SimpleCoordinationStorage();

////////////////////////////////////////////////////////////////////

const requestHandler = (request, response) => {
    console.log(request.url)
    let parts = request.url.split("/");
    if (parts[0] == "messages") {
        storage.getMessages()
    }
    response.end('Hello Node.js Server!')
}



const server = http.createServer(requestHandler)
server.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }
    console.log(`Coordination server is listening on ${port}`)
})
