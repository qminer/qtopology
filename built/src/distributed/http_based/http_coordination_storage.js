"use strict";
var http_server = require('./http_server');
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
var HttpCoordinationStorage = (function () {
    function HttpCoordinationStorage() {
        this._workers = [];
        this._topologies = [];
        this._messages = [];
    }
    HttpCoordinationStorage.prototype.addTopology = function (config) {
        this._topologies.push({
            uuid: config.general.name,
            config: config,
            status: "unassigned",
            worker: null,
            last_ping: Date.now()
        });
    };
    /** Performs upsert of worker record. It's initial status is alive */
    HttpCoordinationStorage.prototype.registerWorker = function (name) {
        var rec = null;
        console.log("Registering worker", name);
        for (var _i = 0, _a = this._workers; _i < _a.length; _i++) {
            var worker = _a[_i];
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
            this._workers.push(rec);
        }
        return { success: true };
    };
    /** Determines leadership status */
    HttpCoordinationStorage.prototype.getLeadershipStatus = function () {
        this._disableDefunctLeaders();
        var hits = this._workers.filter(function (x) { return x.lstatus == "leader"; });
        if (hits.length > 0)
            return { leadership_status: "ok" };
        hits = this._workers.filter(function (x) { return x.lstatus == "candidate"; });
        if (hits.length > 0)
            return { leadership_status: "pending" };
        return { leadership_status: "vacant" };
    };
    HttpCoordinationStorage.prototype.announceLeaderCandidacy = function (name) {
        this._disableDefunctLeaders();
        // if we already have a leader, abort
        var hits = this._workers.filter(function (x) { return x.lstatus == "leader"; });
        if (hits.length > 0)
            return;
        // find pending records that are not older than 5 sec
        hits = this._workers.filter(function (x) { return x.lstatus == "pending"; });
        if (hits.length > 0)
            return;
        // ok, announce new candidate
        for (var _i = 0, _a = this._workers; _i < _a.length; _i++) {
            var worker = _a[_i];
            if (worker.name == name) {
                worker.lstatus = "pending";
                worker.lstatus_ts = Date.now();
                break;
            }
        }
        return { success: true };
    };
    /** Checks if leadership candidacy for specified worker was successful. */
    HttpCoordinationStorage.prototype.checkLeaderCandidacy = function (name) {
        this._disableDefunctLeaders();
        var res = { leader: false };
        for (var _i = 0, _a = this._workers; _i < _a.length; _i++) {
            var worker = _a[_i];
            if (worker.name == name && worker.lstatus == "pending") {
                worker.lstatus = "leader";
                res.leader = true;
                break;
            }
        }
        return res;
    };
    /** Returns worker statuses */
    HttpCoordinationStorage.prototype.getWorkerStatuses = function () {
        var _this = this;
        this._disableDefunctWorkers();
        return this._workers
            .map(function (x) {
            var cnt = 0;
            _this._topologies.forEach(function (y) {
                cnt += (y.worker === x.name ? 1 : 0);
            });
            return {
                name: x.name,
                status: x.status,
                topology_count: cnt,
                lstatus: x.lstatus,
                last_ping_d: x.last_ping,
                last_ping: new Date(x.last_ping),
                lstatus_ts: x.lstatus_ts,
                lstatus_ts_d: new Date(x.lstatus_ts)
            };
        });
    };
    HttpCoordinationStorage.prototype.getTopologyStatuses = function () {
        this._disableDefunctWorkers();
        this._unassignWaitingTopologies();
        return this._topologies
            .map(function (x) {
            return {
                uuid: x.uuid,
                status: x.status,
                worker: x.worker
            };
        });
    };
    HttpCoordinationStorage.prototype.getTopologiesForWorker = function (name) {
        return this._topologies.filter(function (x) { return x.worker === name; });
    };
    HttpCoordinationStorage.prototype.assignTopology = function (uuid, target) {
        var topology = this._topologies.filter(function (x) { return x.uuid == uuid; })[0];
        this._messages.push({
            worker: target,
            cmd: "start",
            content: {
                uuid: uuid,
                config: topology.config
            }
        });
        topology.status = "waiting";
        topology.worker = target;
        return { success: true };
    };
    HttpCoordinationStorage.prototype.markTopologyAsRunning = function (uuid) {
        var topology = this._topologies.filter(function (x) { return x.uuid == uuid; })[0];
        topology.status = "running";
        topology.last_ping = Date.now();
        return { success: true };
    };
    HttpCoordinationStorage.prototype.markTopologyAsStopped = function (uuid) {
        var topology = this._topologies.filter(function (x) { return x.uuid == uuid; })[0];
        topology.status = "stopped";
        topology.last_ping = Date.now();
        return { success: true };
    };
    HttpCoordinationStorage.prototype.markTopologyAsError = function (uuid, error) {
        var topology = this._topologies.filter(function (x) { return x.uuid == uuid; })[0];
        topology.status = "error";
        topology.last_ping = Date.now();
        topology.error = error;
        return { success: true };
    };
    HttpCoordinationStorage.prototype.setTopologyPing = function (uuid) {
        var topology = this._topologies.filter(function (x) { return x.uuid == uuid; })[0];
        topology.last_ping = Date.now();
        return { success: true };
    };
    HttpCoordinationStorage.prototype.setTopologyStatus = function (uuid, status, error) {
        if (status == "running")
            return this.markTopologyAsRunning(uuid);
        if (status == "stopped")
            return this.markTopologyAsStopped(uuid);
        if (status == "error")
            return this.markTopologyAsError(uuid, error);
        return { success: false, error: "Unknown topology: " + uuid };
    };
    HttpCoordinationStorage.prototype.setWorkerStatus = function (name, status) {
        var hits = this._workers.filter(function (x) { return x.name === name; });
        if (hits.length > 0) {
            hits[0].status = status;
            if (status !== "alive") {
                hits[0].lstatus = "";
            }
            return { success: true };
        }
        else {
            return { success: false, error: "Unknown worker: " + name };
        }
    };
    HttpCoordinationStorage.prototype.getMessagesForWorker = function (name) {
        this._pingWorker(name);
        var result = this._messages.filter(function (x) { return x.worker === name; });
        this._messages = this._messages.filter(function (x) { return x.worker !== name; });
        return result;
    };
    HttpCoordinationStorage.prototype._pingWorker = function (name) {
        for (var _i = 0, _a = this._workers; _i < _a.length; _i++) {
            var worker = _a[_i];
            if (worker.name == name) {
                worker.last_ping = Date.now();
                break;
            }
        }
    };
    HttpCoordinationStorage.prototype._unassignWaitingTopologies = function () {
        // set topologies to unassigned if they have been waiting too long
        var d = Date.now() - 30 * 1000;
        var worker_map = {};
        for (var _i = 0, _a = this._workers; _i < _a.length; _i++) {
            var worker = _a[_i];
            worker_map[worker.name] = worker.status;
        }
        for (var topology in this._topologies) {
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
    };
    HttpCoordinationStorage.prototype._disableDefunctWorkers = function () {
        // disable workers that did not update their status
        var d = Date.now() - 30 * 1000;
        for (var worker in this._workers) {
            if (worker.status == "alive" && worker.last_ping < d) {
                worker.status = "dead";
            }
        }
    };
    HttpCoordinationStorage.prototype._disableDefunctLeaders = function () {
        // disable worker that did not perform their leadership duties
        var d = Date.now() - 10 * 1000;
        for (var worker in this._workers) {
            if (worker.lstatus == "leader" || worker.lstatus == "candidate") {
                if (worker.last_ping < d) {
                    worker.lstatus = "";
                }
            }
        }
    };
    return HttpCoordinationStorage;
}());
////////////////////////////////////////////////////////////////////
// Initialize storage
var storage = new HttpCoordinationStorage();
////////////////////////////////////////////////////////////////////
// Initialize simple REST server
http_server.addHandler('/worker-statuses', function (data, callback) {
    var result = storage.getWorkerStatuses();
    callback(null, result);
});
http_server.addHandler('/topology-statuses', function (data, callback) {
    var result = storage.getTopologyStatuses();
    callback(null, result);
});
http_server.addHandler('/leadership-status', function (data, callback) {
    var result = storage.getLeadershipStatus();
    callback(null, result);
});
http_server.addHandler('/worker-topologies', function (data, callback) {
    var worker = data.worker;
    var result = storage.getTopologiesForWorker(worker);
    callback(null, result);
});
http_server.addHandler('/get-messages', function (data, callback) {
    var worker = data.worker;
    var result = storage.getMessagesForWorker(worker);
    callback(null, result);
});
http_server.addHandler('/assign-topology', function (data, callback) {
    var worker = data.worker;
    var uuid = data.uuid;
    var result = storage.assignTopology(uuid, worker);
    callback(null, result);
});
http_server.addHandler('/check-leader-candidacy', function (data, callback) {
    var worker = data.worker;
    var result = storage.checkLeaderCandidacy(worker);
    callback(null, result);
});
http_server.addHandler('/announce-leader-candidacy', function (data, callback) {
    var worker = data.worker;
    var result = storage.announceLeaderCandidacy(worker);
    callback(null, result);
});
http_server.addHandler('/register-worker', function (data, callback) {
    var worker = data.worker;
    var result = storage.registerWorker(worker);
    callback(null, result);
});
http_server.addHandler('/set-topology-status', function (data, callback) {
    var uuid = data.uuid;
    var status = data.status;
    var error = data.error;
    var result = storage.setTopologyStatus(uuid, status, error);
    callback(null, result);
});
http_server.addHandler('/set-worker-status', function (data, callback) {
    var name = data.name;
    var status = data.status;
    var result = storage.setWorkerStatus(name, status);
    callback(null, result);
});
/////////////////////////////////////////////////////////////////////////////
exports.addTopology = function (config) {
    storage.addTopology(config);
};
exports.run = function (options) {
    http_server.run(options);
};
