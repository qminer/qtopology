"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
//////////////////////////////////////////////////////////////////////
class GuiBrowserHandler {
    constructor() { }
    init(storage, callback) {
        this.storage = storage;
        callback();
    }
    getFile(name, callback) {
        let self = this;
        if (self.client_side_code) {
            callback(null, self.client_side_code);
        }
        else {
            let fname = path.join(__dirname, "client_side_code.xjs");
            fs.readFile(fname, "utf8", (err, content) => {
                if (err)
                    return callback(err);
                self.client_side_code = content;
                callback(null, content);
            });
        }
    }
    getWorkerStatus(callback) {
        this.storage.getWorkerStatus((err, data) => {
            if (err)
                return callback(err);
            callback(null, JSON.stringify({ data: data }));
        });
    }
    getTopologyStatus(callback) {
        this.storage.getTopologyStatus((err, data) => {
            if (err)
                return callback(err);
            callback(null, JSON.stringify({ data: data }));
        });
    }
    postRegisterTopology(config, overwrite, callback) {
        this.storage.registerTopology(config, overwrite, callback);
    }
    postDisableTopology(uuid, callback) {
        this.storage.disableTopology(uuid, callback);
    }
    postEnableTopology(uuid, callback) {
        this.storage.enableTopology(uuid, callback);
    }
    postDeleteTopology(uuid, callback) {
        this.storage.deleteTopology(uuid, callback);
    }
}
exports.GuiBrowserHandler = GuiBrowserHandler;
//# sourceMappingURL=gui_browser.js.map