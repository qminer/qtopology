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
        this.file_patterns = (typeof file_pattern === "string" ? [file_pattern] : file_pattern);
        this.file_patterns_regex = this.file_patterns
            .map(x => this.createRegexpForPattern(x));
        let items = fs.readdirSync(this.dir_name);
        console.log("[FileCoordinator] Starting file-based coordination, from directory", this.dir_name);
        for (let item of items) {
            let is_ok = false;
            for (let pattern of this.file_patterns_regex) {
                if (item.match(pattern)) {
                    is_ok = true;
                    continue;
                }
            }
            if (!is_ok) {
                continue;
            }
            console.log("[FileCoordinator] Found topology file", item);
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
        console.log(`[FileCoordinator] Setting topology status: uuid=${uuid} status=${status} error=${error}`);
        callback(null);
    }
    setWorkerStatus(worker, status, callback) {
        console.log(`[FileCoordinator] Setting worker status: name=${worker} status=${status}`);
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