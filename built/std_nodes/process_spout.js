"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
/** This spout executes specified process, collects its stdout, parses it and emits tuples. */
class ProcessSpout {
    constructor() {
        //this.name = null;
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.should_run = false;
    }
    init(name, config, context, callback) {
        //this.name = name;
        this.stream_id = config.stream_id;
        this.cmd_line = config.cmd_line;
        this.file_format = config.file_format || "json";
        this.tuples = [];
        if (this.file_format == "csv") {
            this.csv_separator = config.separator || ",";
            this.csv_fields = config.fields;
            this.csv_has_header = config.csv_has_header;
        }
        let args = this.cmd_line.split(" ");
        let cmd = args[0];
        args = args.slice(1);
        let content2 = cp.spawnSync(cmd, args).output[1];
        let content = content2.toString();
        if (this.file_format == "json") {
            this.readJsonFile(content);
        }
        else if (this.file_format == "csv") {
            this.readCsvFile(content);
        }
        else if (this.file_format == "raw") {
            this.readRawFile(content);
        }
        else {
            callback(new Error("Unsupported file format: " + this.file_format));
        }
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
        if (!this.should_run) {
            return callback(null, null, null);
        }
        if (this.tuples.length === 0) {
            return callback(null, null, null);
        }
        let data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        callback(null, data, this.stream_id);
    }
    readJsonFile(content) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length == 0)
                continue;
            this.tuples.push(JSON.parse(line));
        }
    }
    readRawFile(content) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0)
                continue;
            this.tuples.push({ content: line });
        }
    }
    readCsvFile(content) {
        let lines = content.split("\n");
        // if CSV file contains header, use it.
        // otherwise, the first line already contains data
        if (this.csv_has_header) {
            // read first list and parse fields names
            let header = lines[0].replace("\r", "");
            this.csv_fields = header.split(this.csv_separator);
            ;
            lines = lines.slice(1);
        }
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0)
                continue;
            let values = line.split(this.csv_separator);
            let result = {};
            for (let i = 0; i < this.csv_fields.length; i++) {
                result[this.csv_fields[i]] = values[i];
            }
            this.tuples.push(result);
        }
    }
}
exports.ProcessSpout = ProcessSpout;
//# sourceMappingURL=process_spout.js.map