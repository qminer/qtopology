import * as fs from "fs";
import * as path from "path";
import * as EventEmitter from 'events';
import * as intf from "../../topology_interfaces";

//////////////////////////////////////////////////////////////////////

export class FileCoordinator implements intf.CoordinationStorage {

    private msgs: intf.StorageResultMessage[];
    private dir_name: string;
    private file_patterns: string[];
    private file_patterns_regex: RegExp[];

    constructor(dir_name: string, file_pattern: string | string[]) {
        this.msgs = [];
        this.dir_name = dir_name;
        this.dir_name = path.resolve(this.dir_name);
        this.file_patterns = (typeof file_pattern === "string" ? [file_pattern as string] : file_pattern as string[]);
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

    getMessages(name: string, callback: intf.SimpleResultCallback<intf.StorageResultMessage[]>) {
        let tmp = this.msgs;
        this.msgs = [];
        callback(null, tmp);
    }
    getWorkerStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultWorkerStatus[]>) {
        callback(null, []);
    }
    getTopologyStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>) {
        callback(null, []);
    }
    getTopologiesForWorker(worker: string, callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>) {
        callback(null, []);
    }
    getLeadershipStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultStatus>) {
        callback(null, { leadership: "ok" });
    }
    registerWorker(name: string, callback: intf.SimpleCallback) {
        callback(null);
    }
    announceLeaderCandidacy(name: string, callback: intf.SimpleCallback) {
        callback(null);
    }
    checkLeaderCandidacy(name: string, callback: intf.SimpleResultCallback<boolean>) {
        callback(null);
    }
    assignTopology(uuid: string, worker: string, callback: intf.SimpleCallback) {
        callback(null);
    }
    setTopologyStatus(uuid: string, status: string, error: string, callback: intf.SimpleCallback) {
        console.log(`[FileCoordinator] Setting topology status: uuid=${uuid} status=${status} error=${error}`);
        callback(null);
    }
    setWorkerStatus(worker: string, status: string, callback: intf.SimpleCallback) {
        console.log(`[FileCoordinator] Setting worker status: name=${worker} status=${status}`);
        callback(null);
    }

    private createRegexpForPattern(str: string): RegExp {
        if (!str) return /.*/g;
        str = str
            .replace(/\./g, "\.")
            .replace(/\*/g, ".*");
        return new RegExp("^" + str + "$", "gi");
    }
}
