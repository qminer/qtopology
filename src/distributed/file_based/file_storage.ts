import * as fs from "fs";
import * as path from "path";
import * as intf from "../../topology_interfaces";
import * as log from "../../util/logger";
import * as mem from "../memory/memory_storage";

//////////////////////////////////////////////////////////////////////

export class FileStorage extends mem.MemoryStorage {

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

        const items = fs.readdirSync(this.dir_name);
        log.logger().log("[FileStorage] Starting file-based coordination, from directory " + this.dir_name);
        for (const item of items) {
            let is_ok = false;
            for (const pattern of this.file_patterns_regex) {
                if (item.match(pattern)) {
                    is_ok = true;
                    continue;
                }
            }
            if (!is_ok) {
                continue;
            }

            const topology_uuid = item.slice(0, -path.extname(item).length); // file name without extension
            log.logger().log("[FileStorage] Found topology file " + item);
            const config = require(path.join(this.dir_name, item));

            this.registerTopology(topology_uuid, config, err => {
                // no-op
            });
            this.enableTopology(topology_uuid, err => {
                // no-op
             });
        }
    }

    public getProperties(callback: intf.SimpleResultCallback<intf.IStorageProperty[]>) {
        const res = [];
        res.push({ key: "type", value: "FileStorage" });
        res.push({ key: "directory", value: this.dir_name });
        res.push({ key: "file_patterns", value: this.file_patterns });
        res.push({ key: "file_patterns_regex", value: this.file_patterns_regex });
        callback(null, res);
    }

    private createRegexpForPattern(str: string): RegExp {
        if (!str) { return /.*/g; }
        str = str
            .replace(/\./g, "\.")
            .replace(/\*/g, ".*");
        return new RegExp("^" + str + "$", "gi");
    }
}
