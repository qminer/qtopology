import * as fs from "fs";
import * as path from "path";
import * as EventEmitter from 'events';
import * as intf from "../../topology_interfaces";

//////////////////////////////////////////////////////////////////////

export class FileCoordinator implements intf.CoordinationStorage {

    _msgs: intf.StorageResultMessage[];
    _dir_name: string;
    _file_pattern: string;
    _file_pattern_regex: RegExp;

    constructor(dir_name: string, file_pattern: string) {
        this._msgs = [];
        this._dir_name = dir_name;
        this._dir_name = path.resolve(this._dir_name);
        this._file_pattern = file_pattern;
        this._file_pattern_regex = this._createRegexpForPattern(this._file_pattern);

        let items = fs.readdirSync(this._dir_name);
        console.log("Starting file-based coordination, from directory", this._dir_name);
        for (let item of items) {
            if (path.extname(item) != ".json") continue;
            if (!item.match(this._file_pattern_regex)) continue;
            console.log("Found topology file", item);
            let config = require(path.join(this._dir_name, item));
            this._msgs.push({
                cmd: "start",
                content: {
                    uuid: config.general.name,
                    config: config
                }
            });
        }
    }

    getMessages(name: string, callback: intf.SimpleResultCallback<intf.StorageResultMessage[]>) {
        let tmp = this._msgs;
        this._msgs = [];
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
        console.log(`Setting topology status: uuid=${uuid} status=${status} error=${error}`);
        callback(null);
    }
    setWorkerStatus(worker: string, status: string, callback: intf.SimpleCallback) {
        console.log(`Setting worker status: name=${name} status=${status}`);
        callback(null);
    }

    _createRegexpForPattern(str: string): RegExp {
        if (!str) return /.*/g;
        str = str
            .replace(/\./g, "\.")
            .replace(/\*/g, ".*");
        return new RegExp("^" + str + "$", "gi");
    }
}
