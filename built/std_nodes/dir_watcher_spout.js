"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
class FileChangeRec {
}
/** This spout monitors directory for changes. */
class DirWatcherSpout {
    constructor() {
        this.should_run = true;
        this.dir_name = null;
        this.queue = [];
        this.stream_id = null;
    }
    init(name, config, context, callback) {
        this.dir_name = path.resolve(config.dir_name);
        this.stream_id = config.stream_id;
        let self = this;
        fs.watch(self.dir_name, { persistent: false }, (eventType, filename) => {
            if (filename) {
                let rec = new FileChangeRec();
                rec.change_type = eventType;
                rec.file_name = "" + filename;
                rec.target_dir = self.dir_name;
                rec.ts = new Date();
                this.queue.push(rec);
            }
        });
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    run() {
        this.should_run = true;
    }
    pause() {
        this.should_run = false;
    }
    next(callback) {
        if (!this.should_run || this.queue.length === 0) {
            return callback(null, null, null);
        }
        let data = this.queue[0];
        this.queue = this.queue.slice(1);
        callback(null, data, this.stream_id);
    }
}
exports.DirWatcherSpout = DirWatcherSpout;
//# sourceMappingURL=dir_watcher_spout.js.map