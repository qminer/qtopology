"use strict";

const fs = require("fs");
const path = require("path");
const EventEmitter = require('events');

//////////////////////////////////////////////////////////////////////
// Storage-coordination implementation

class FileCoordinator {

    constructor(dir_name) {
        this._msgs = [];
        dir_name = path.resolve(dir_name);
        let items = fs.readdirSync(dir_name);
        console.log("Starting file-based coordination, from directory", dir_name);
        for (let item of items) {
            if (path.extname(item) != ".json") continue;
            console.log("Found topology file", item);
            let config = require(path.join(dir_name, item));
            this._msgs.push({
                worker: "",
                cmd: "start",
                content: {
                    uuid: config.general.name,
                    config: config
                }
            });
        }
    }

    getMessages(name, callback) {
        let tmp = this._msgs;
        this._msgs = [];
        callback(null, tmp);
    }
    getWorkerStatus(callback) {
        callback(null, []);
    }
    getTopologyStatus(callback) {
        callback(null, []);
    }
    getTopologiesForWorker(name, callback) {
        callback(null, []);
    }
    getLeadershipStatus(callback) {
        callback(null, { leadership: "ok" });
    }
    registerWorker(name, callback) {
        callback(null, { success: true });
    }
    announceLeaderCandidacy(name, callback) {
        callback(null, { success: true });
    }
    checkLeaderCandidacy(name, callback) {
        callback(null, { success: true });
    }
    assignTopology(uuid, name, callback) {
        callback(null, { success: true });
    }
    setTopologyStatus(uuid, status, error, callback) {
        callback(null, { success: true });
    }
    setWorkerStatus(name, status, callback) {
        callback(null, { success: true });
    }
}

////////////////////////////////////////////////////////////////////

exports.FileCoordinator = FileCoordinator;
