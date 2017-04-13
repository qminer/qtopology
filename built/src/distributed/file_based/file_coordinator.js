"use strict";
var fs = require("fs");
var path = require("path");
var EventEmitter = require('events');
//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation
var FileCoordinator = (function () {
    function FileCoordinator(options) {
        this._msgs = [];
        this._dir_name = options.dir_name;
        this._dir_name = path.resolve(this._dir_name);
        this._file_pattern = options.file_pattern;
        this._file_pattern_regex = this._createRegexpForPattern(this._file_pattern);
        var items = fs.readdirSync(this._dir_name);
        console.log("Starting file-based coordination, from directory", this._dir_name);
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item = items_1[_i];
            if (path.extname(item) != ".json")
                continue;
            if (!item.match(this._file_pattern_regex))
                continue;
            console.log("Found topology file", item);
            var config = require(path.join(this._dir_name, item));
            this._msgs.push({
                worker: "",
                cmd: "start",
                content: {
                    uuid: config.general.name,
                    config: config
                }
            });
        }
    }
    FileCoordinator.prototype.getMessages = function (name, callback) {
        var tmp = this._msgs;
        this._msgs = [];
        callback(null, tmp);
    };
    FileCoordinator.prototype.getWorkerStatus = function (callback) {
        callback(null, []);
    };
    FileCoordinator.prototype.getTopologyStatus = function (callback) {
        callback(null, []);
    };
    FileCoordinator.prototype.getTopologiesForWorker = function (name, callback) {
        callback(null, []);
    };
    FileCoordinator.prototype.getLeadershipStatus = function (callback) {
        callback(null, { leadership: "ok" });
    };
    FileCoordinator.prototype.registerWorker = function (name, callback) {
        callback(null, { success: true });
    };
    FileCoordinator.prototype.announceLeaderCandidacy = function (name, callback) {
        callback(null, { success: true });
    };
    FileCoordinator.prototype.checkLeaderCandidacy = function (name, callback) {
        callback(null, { success: true });
    };
    FileCoordinator.prototype.assignTopology = function (uuid, name, callback) {
        callback(null, { success: true });
    };
    FileCoordinator.prototype.setTopologyStatus = function (uuid, status, error, callback) {
        callback(null, { success: true });
    };
    FileCoordinator.prototype.setWorkerStatus = function (name, status, callback) {
        callback(null, { success: true });
    };
    FileCoordinator.prototype._createRegexpForPattern = function (str) {
        if (!str)
            return /.*/g;
        str = str
            .replace(/\./g, "\.")
            .replace(/\*/g, ".*");
        return new RegExp("^" + str + "$", "gi");
    };
    return FileCoordinator;
}());
////////////////////////////////////////////////////////////////////
exports.FileCoordinator = FileCoordinator;
