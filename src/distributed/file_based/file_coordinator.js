"use strict";

const fs = require("fs");
const path = require("path");
const EventEmitter = require('events');

//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation

class FileCoordinator {

    constructor(options) {
        this._msgs = [];
        this._dir_name = options.dir_name;
        this._dir_name = path.resolve(this._dir_name);
        this._file_pattern = options.file_pattern;
        this._file_pattern_regex = this._createRegexpForPattern(this._file_pattern);

        let items = fs.readdirSync(this._dir_name);
        console.log("Starting file-based coordination, from directory", this._dir_name);
        for (let item of items) {
            if (path.extname(item) != ".json") continue;
            if (!item.match(this._file_pattern_regex)) continue;
            console.log("Found topology file", item);
            let config = require(path.join(this._dir_name, item));
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

    getMessages(name, callback) {
        let tmp = this._msgs;
        this._msgs = [];
        callback(null, tmp);
    }
    getWorkerStatus(callback) {
        callback(null, []);
    }
    getTopologyStatus(callback) {
        callback(null, []);
    }
    getTopologiesForWorker(name, callback) {
        callback(null, []);
    }
    getLeadershipStatus(callback) {
        callback(null, { leadership: "ok" });
    }
    registerWorker(name, callback) {
        callback(null, { success: true });
    }
    announceLeaderCandidacy(name, callback) {
        callback(null, { success: true });
    }
    checkLeaderCandidacy(name, callback) {
        callback(null, { success: true });
    }
    assignTopology(uuid, name, callback) {
        callback(null, { success: true });
    }
    setTopologyStatus(uuid, status, error, callback) {
        console.log(`Setting topology status: uuid=${uuid} status=${status} error=${error}`);
        callback(null, { success: true });
    }
    setWorkerStatus(name, status, callback) {
        console.log(`Setting worker status: name=${name} status=${status}`);
        callback(null, { success: true });
    }

    _createRegexpForPattern(str) {
        if (!str) return /.*/g;
        str = str
            .replace(/\./g, "\.")
            .replace(/\*/g, ".*");
        return new RegExp("^" + str + "$", "gi");
    }
}

////////////////////////////////////////////////////////////////////

exports.FileCoordinator = FileCoordinator;
