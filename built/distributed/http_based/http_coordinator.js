"use strict";
var port = 3000;
var Client = require('node-rest-client').Client;
var EventEmitter = require('events');
//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation
var HttpCoordinator = (function () {
    function HttpCoordinator(options) {
        options = options || {};
        this._port = options.port || port;
        this._client = new Client();
        this._urlPrefix = "http://localhost:" + this._port + "/";
    }
    HttpCoordinator.prototype.getMessages = function (name, callback) {
        this._call("get-messages", { worker: name }, callback);
    };
    HttpCoordinator.prototype.getWorkerStatus = function (callback) {
        this._call("worker-statuses", {}, callback);
    };
    HttpCoordinator.prototype.getTopologyStatus = function (callback) {
        this._call("topology-statuses", {}, callback);
    };
    HttpCoordinator.prototype.getTopologiesForWorker = function (name, callback) {
        this._call("worker-topologies", { worker: name }, callback);
    };
    HttpCoordinator.prototype.getLeadershipStatus = function (callback) {
        this._call("leadership-status", {}, callback);
    };
    HttpCoordinator.prototype.registerWorker = function (name, callback) {
        this._call("register-worker", { worker: name }, callback);
    };
    HttpCoordinator.prototype.announceLeaderCandidacy = function (name, callback) {
        this._call("announce-leader-candidacy", { worker: name }, callback);
    };
    HttpCoordinator.prototype.checkLeaderCandidacy = function (name, callback) {
        this._call("check-leader-candidacy", { worker: name }, callback);
    };
    HttpCoordinator.prototype.assignTopology = function (uuid, name, callback) {
        this._call("assign-topology", { worker: name, uuid: uuid }, callback);
    };
    HttpCoordinator.prototype.setTopologyStatus = function (uuid, status, error, callback) {
        this._call("set-topology-status", { uuid: uuid, status: status, error: error }, callback);
    };
    HttpCoordinator.prototype.setWorkerStatus = function (name, status, callback) {
        this._call("set-worker-status", { name: name, status: status }, callback);
    };
    HttpCoordinator.prototype._call = function (addr, req_data, callback) {
        var self = this;
        var args = { data: req_data, headers: { "Content-Type": "application/json" } };
        var req = this._client.post(self._urlPrefix + addr, args, function (data, response) {
            callback(null, data);
        });
        req.on('error', function (err) {
            callback(err);
        });
    };
    return HttpCoordinator;
}());
////////////////////////////////////////////////////////////////////
exports.HttpCoordinator = HttpCoordinator;
