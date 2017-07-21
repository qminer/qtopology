import * as fs from "fs";
import * as path from "path";
import * as EventEmitter from 'events';
import * as intf from "../../topology_interfaces";
import * as log from "../../util/logger";
import * as mem from "../memory/memory_coordinator";

//////////////////////////////////////////////////////////////////////

export class FileCoordinator extends mem.MemoryCoordinator {

    private dir_name: string;
    private file_patterns: string[];
    private file_patterns_regex: RegExp[];

    constructor(dir_name: string, file_pattern: string | string[]) {
        super();
        this.dir_name = dir_name;
        this.dir_name = path.resolve(this.dir_name);
        this.file_patterns = (typeof file_pattern === "string" ? [file_pattern as string] : file_pattern as string[]);
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

    getProperties(callback: intf.SimpleResultCallback<intf.StorageProperty[]>) {
        let res = [];
        res.push({ key: "type", value: "FileCoordinator" });
        res.push({ key: "directory", value: this.dir_name });
        res.push({ key: "file_patterns", value: this.file_patterns });
        res.push({ key: "file_patterns_regex", value: this.file_patterns_regex });
        callback(null, res);
    }

    private createRegexpForPattern(str: string): RegExp {
        if (!str) return /.*/g;
        str = str
            .replace(/\./g, "\.")
            .replace(/\*/g, ".*");
        return new RegExp("^" + str + "$", "gi");
    }
}
