"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sh = require("../util/stream_helpers");
const fs = require("fs");
const rl = require("readline");
const high_water = 5000;
const low_water = 50;
/** This spout reads input file in several supported formats and emits tuples. */
class FileReaderSpout2 {
    constructor() {
        this.name = null;
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.file_name = null;
        this.should_run = false;
    }
    init(name, config, context, callback) {
        this.name = name;
        this.stream_id = config.stream_id;
        this.file_name = config.file_name;
        this.file_format = config.file_format || "json";
        this.tuples = [];
        if (this.file_format == "csv") {
            this.csv_separator = config.separator || ",";
            this.csv_fields = config.fields;
        }
        sh.importFileByLine(this.file_name, {
            addLine: (line) => {
                if (this.file_format == "json") {
                    this.processLineJson(line);
                }
                else if (this.file_format == "csv") {
                    this.processLineCsv(line);
                }
                else if (this.file_format == "raw") {
                    this.processLineRaw(line);
                }
            }
        }, null);
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
    processLineJson(content) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length == 0)
                continue;
            this.tuples.push(JSON.parse(line));
        }
    }
    processLineRaw(content) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0)
                return;
            this.tuples.push({ content: line });
        }
    }
    processLineCsv(line) {
        if (!this.csv_header) {
            this.csv_header = line.split(this.csv_separator);
            return;
        }
        else {
            line = line.trim();
            if (line.length == 0)
                return;
            let values = line.split(this.csv_separator);
            let result = {};
            for (let i = 0; i < this.csv_header.length; i++) {
                let name = this.csv_header[i];
                if (!this.csv_fields || this.csv_fields.indexOf(name) >= 0) {
                    result[name] = values[i];
                }
            }
            this.tuples.push(result);
        }
    }
}
exports.FileReaderSpout2 = FileReaderSpout2;
/** This spout reads input file in several supported formats and emits tuples. */
class FileReaderSpout {
    constructor() {
        this.name = null;
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.file_name = null;
        this.should_run = false;
        this.line_reader_paused = false;
    }
    init(name, config, context, callback) {
        this.name = name;
        this.stream_id = config.stream_id;
        this.file_name = config.file_name;
        this.file_format = config.file_format || "json";
        this.tuples = [];
        if (this.file_format == "csv") {
            this.csv_separator = config.separator || ",";
            this.csv_fields = config.fields;
        }
        this.line_reader = rl.createInterface({ input: fs.createReadStream(this.file_name) });
        this.line_reader.on('line', (line) => {
            if (this.file_format == "json") {
                this.processLineJson(line);
            }
            else if (this.file_format == "csv") {
                this.processLineCsv(line);
            }
            else if (this.file_format == "raw") {
                this.processLineRaw(line);
            }
            if (this.tuples.length > high_water && !this.line_reader_paused) {
                console.log("### pausing...");
                this.line_reader.pause();
                this.line_reader_paused = true;
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
        if (!this.should_run) {
            return callback(null, null, null);
        }
        if (this.tuples.length < low_water && this.line_reader_paused) {
            this.line_reader.resume();
            console.log("### resuming....");
            this.line_reader_paused = false;
        }
        if (this.tuples.length === 0) {
            return callback(null, null, null);
        }
        let data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        callback(null, data, this.stream_id);
    }
    processLineJson(content) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length == 0)
                continue;
            this.tuples.push(JSON.parse(line));
        }
    }
    processLineRaw(content) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0)
                return;
            this.tuples.push({ content: line });
        }
    }
    processLineCsv(line) {
        if (!this.csv_header) {
            this.csv_header = line.split(this.csv_separator);
            return;
        }
        else {
            line = line.trim();
            if (line.length == 0)
                return;
            let values = line.split(this.csv_separator);
            let result = {};
            for (let i = 0; i < this.csv_header.length; i++) {
                let name = this.csv_header[i];
                if (!this.csv_fields || this.csv_fields.indexOf(name) >= 0) {
                    result[name] = values[i];
                }
            }
            this.tuples.push(result);
        }
    }
}
exports.FileReaderSpout = FileReaderSpout;
//# sourceMappingURL=file_reader_spout.js.map