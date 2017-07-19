import * as fs from "fs";
import * as path from "path";
import * as EventEmitter from 'events';
import * as intf from "../../topology_interfaces";
import * as log from "../../util/logger";

//////////////////////////////////////////////////////////////////////

export class FileCoordinator implements intf.CoordinationStorage {

    private msgs: intf.StorageResultMessage[];
    private dir_name: string;
    private file_patterns: string[];
    private file_patterns_regex: RegExp[];
    private topology_configs: Map<string, any>;

    constructor(dir_name: string, file_pattern: string | string[]) {
        this.msgs = [];
        this.dir_name = dir_name;
        this.dir_name = path.resolve(this.dir_name);
        this.file_patterns = (typeof file_pattern === "string" ? [file_pattern as string] : file_pattern as string[]);
        this.file_patterns_regex = this.file_patterns
            .map(x => this.createRegexpForPattern(x));
        this.topology_configs = new Map<string, any>();

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
            this.msgs.push({
                cmd: "start",
                content: {
                    uuid: topology_uuid,
                    config: config
                }
            });
            this.topology_configs.set(topology_uuid, config);
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
    getTopologyDefinition(uuid: string, callback: intf.SimpleResultCallback<any>) {
        if (this.topology_configs.has(uuid)) {
            callback(null, this.topology_configs.get(uuid));
        } else {
            callback(new Error("Topology with given uuid doesn't exist: " + uuid));
        }
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
        log.logger().log(`[FileCoordinator] Setting topology status: uuid=${uuid} status=${status} error=${error}`);
        callback(null);
    }
    setWorkerStatus(worker: string, status: string, callback: intf.SimpleCallback) {
        log.logger().log(`[FileCoordinator] Setting worker status: name=${worker} status=${status}`);
        callback(null);
    }

    registerTopology(uuid: string, config: any, callback: intf.SimpleCallback) {
        callback(new Error("Operation not supported by this storage: registerTopology"));
    }
    disableTopology(uuid: string, callback: intf.SimpleCallback) {
        callback(new Error("Operation not supported by this storage: disableTopology"));
    }
    enableTopology(uuid: string, callback: intf.SimpleCallback) {
        callback(new Error("Operation not supported by this storage: enableTopology"));
    }
    deleteTopology(uuid: string, callback: intf.SimpleCallback) {
        callback(new Error("Operation not supported by this storage: deleteTopology"));
    }

    private createRegexpForPattern(str: string): RegExp {
        if (!str) return /.*/g;
        str = str
            .replace(/\./g, "\.")
            .replace(/\*/g, ".*");
        return new RegExp("^" + str + "$", "gi");
    }
}
