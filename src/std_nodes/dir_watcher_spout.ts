import * as intf from "../topology_interfaces";
import * as fs from 'fs';
import * as path from 'path';

class FileChangeRec {
    target_dir: string;
    file_name: string;
    change_type: string;
    ts: Date;
}

/** This spout monitors directory for changes. */
export class DirWatcherSpout implements intf.Spout {
    private dir_name: string;
    private queue: FileChangeRec[];
    private should_run: boolean;
    private stream_id: string;

    constructor() {
        this.should_run = true;
        this.dir_name = null;
        this.queue = [];
        this.stream_id = null;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
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

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    run() {
        this.should_run = true;
    }

    pause() {
        this.should_run = false;
    }

    next(callback: intf.SpoutNextCallback) {
        if (!this.should_run || this.queue.length === 0) {
            return callback(null, null, null);
        }
        let data = this.queue[0];
        this.queue = this.queue.slice(1);
        callback(null, data, this.stream_id);
    }
}
