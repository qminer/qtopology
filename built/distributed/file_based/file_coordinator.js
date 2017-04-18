"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
//////////////////////////////////////////////////////////////////////
class FileCoordinator {
    constructor(dir_name, file_pattern) {
        this.msgs = [];
        this.dir_name = dir_name;
        this.dir_name = path.resolve(this.dir_name);
        this.file_pattern = file_pattern;
        this.file_pattern_regex = this.createRegexpForPattern(this.file_pattern);
        let items = fs.readdirSync(this.dir_name);
        console.log("Starting file-based coordination, from directory", this.dir_name);
        for (let item of items) {
            if (path.extname(item) != ".json")
                continue;
            if (!item.match(this.file_pattern_regex))
                continue;
            console.log("Found topology file", item);
            let config = require(path.join(this.dir_name, item));
            this.msgs.push({
                cmd: "start",
                content: {
                    uuid: config.general.name,
                    config: config
                }
            });
        }
    }
    getMessages(name, callback) {
        let tmp = this.msgs;
        this.msgs = [];
        callback(null, tmp);
    }
    getWorkerStatus(callback) {
        callback(null, []);
    }
    getTopologyStatus(callback) {
        callback(null, []);
    }
    getTopologiesForWorker(worker, callback) {
        callback(null, []);
    }
    getLeadershipStatus(callback) {
        callback(null, { leadership: "ok" });
    }
    registerWorker(name, callback) {
        callback(null);
    }
    announceLeaderCandidacy(name, callback) {
        callback(null);
    }
    checkLeaderCandidacy(name, callback) {
        callback(null);
    }
    assignTopology(uuid, worker, callback) {
        callback(null);
    }
    setTopologyStatus(uuid, status, error, callback) {
        console.log(`Setting topology status: uuid=${uuid} status=${status} error=${error}`);
        callback(null);
    }
    setWorkerStatus(worker, status, callback) {
        console.log(`Setting worker status: name=${name} status=${status}`);
        callback(null);
    }
    createRegexpForPattern(str) {
        if (!str)
            return /.*/g;
        str = str
            .replace(/\./g, "\.")
            .replace(/\*/g, ".*");
        return new RegExp("^" + str + "$", "gi");
    }
}
exports.FileCoordinator = FileCoordinator;
//# sourceMappingURL=file_coordinator.js.map