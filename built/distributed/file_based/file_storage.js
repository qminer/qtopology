"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const log = require("../../util/logger");
const mem = require("../memory/memory_storage");
//////////////////////////////////////////////////////////////////////
class FileStorage extends mem.MemoryStorage {
    constructor(dir_name, file_pattern) {
        super();
        this.dir_name = dir_name;
        this.dir_name = path.resolve(this.dir_name);
        this.file_patterns = (typeof file_pattern === "string" ? [file_pattern] : file_pattern);
        this.file_patterns_regex = this.file_patterns
            .map(x => this.createRegexpForPattern(x));
        let items = fs.readdirSync(this.dir_name);
        log.logger().log("[FileCoordinator] Starting file-based coordination, from directory " + this.dir_name);
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
            let topology_uuid = item.slice(0, -path.extname(item).length); // file name without extension
            log.logger().log("[FileCoordinator] Found topology file " + item);
            let config = require(path.join(this.dir_name, item));
            this.registerTopology(topology_uuid, config, (err) => { });
            this.enableTopology(topology_uuid, (err) => { });
        }
    }
    getProperties(callback) {
        let res = [];
        res.push({ key: "type", value: "FileCoordinator" });
        res.push({ key: "directory", value: this.dir_name });
        res.push({ key: "file_patterns", value: this.file_patterns });
        res.push({ key: "file_patterns_regex", value: this.file_patterns_regex });
        callback(null, res);
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
exports.FileStorage = FileStorage;
//# sourceMappingURL=file_storage.js.map