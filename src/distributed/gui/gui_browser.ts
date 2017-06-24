import * as path from "path";
import * as fs from "fs";
import * as intf from "../../topology_interfaces";
import * as log from "../../util/logger";

//////////////////////////////////////////////////////////////////////

export class GuiBrowserHandler implements intf.CoordinationStorageBrowser {

    private storage: intf.CoordinationStorage;
    private client_side_code: string;

    constructor() { }

    init(storage: intf.CoordinationStorage, callback: intf.SimpleCallback) {
        this.storage = storage;
        callback();
    }

    getFile(name: string, callback: intf.SimpleResultCallback<string>) {
        let self = this;
        if (self.client_side_code) {
            callback(null, self.client_side_code);
        } else {
            let fname = path.join(__dirname, "client_side_code.xjs");
            fs.readFile(fname, "utf8", (err, content) => {
                if (err) return callback(err);
                self.client_side_code = content;
                callback(null, content);
            });
        }
    }

    getWorkerStatus(callback: intf.SimpleResultCallback<string>) {
        this.storage.getWorkerStatus((err, data) => {
            if (err) return callback(err);
            callback(null, JSON.stringify({ data: data }));
        });
    }
    getTopologyStatus(callback: intf.SimpleResultCallback<string>) {
        this.storage.getTopologyStatus((err, data) => {
            if (err) return callback(err);
            callback(null, JSON.stringify({ data: data }));
        });
    }

    postRegisterTopology(config: any, overwrite: boolean, callback: intf.SimpleCallback) {
        this.storage.registerTopology(config, overwrite, callback);
    }
    postDisableTopology(uuid: string, callback: intf.SimpleCallback) {
        this.storage.disableTopology(uuid, callback);
    }
    postEnableTopology(uuid: string, callback: intf.SimpleCallback) {
        this.storage.enableTopology(uuid, callback);
    }

    postDeleteTopology(uuid: string, callback: intf.SimpleCallback) {
        this.storage.deleteTopology(uuid, callback);
    }
}
