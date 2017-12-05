"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const parsing_utils_1 = require("./parsing_utils");
/** This spout executes specified process, collects its stdout, parses it and emits tuples. */
class ProcessSpout {
    constructor() {
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.should_run = false;
    }
    init(name, config, context, callback) {
        this.stream_id = config.stream_id;
        this.cmd_line = config.cmd_line;
        this.file_format = config.file_format || "json";
        this.tuples = [];
        if (this.file_format == "csv") {
            config.separator = config.separator || ",";
            this.csv_parser = new parsing_utils_1.CsvParser(config);
            // this.csv_separator = config.separator || ",";
            // this.csv_fields = config.fields;
            // this.csv_has_header = config.csv_has_header;
        }
        this.runProcessAndCollectOutput(callback);
    }
    runProcessAndCollectOutput(callback) {
        let args = this.cmd_line.split(" ");
        let cmd = args[0];
        args = args.slice(1);
        let content2 = cp.spawnSync(cmd, args).output[1];
        let content = content2.toString();
        if (this.file_format == "json") {
            parsing_utils_1.Utils.readJsonFile(content, this.tuples);
        }
        else if (this.file_format == "csv") {
            //Utils.readCsvFile(content, this.tuples, this.csv_has_header, this.csv_separator, this.csv_fields);
            this.csv_parser.process(content, this.tuples);
        }
        else if (this.file_format == "raw") {
            parsing_utils_1.Utils.readRawFile(content, this.tuples);
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
}
exports.ProcessSpout = ProcessSpout;
/** This spout spawns specified process and starts collecting its stdout, parsing it and emiting the tuples. */
class ProcessSpoutContinuous {
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
            config.separator = config.separator || ",";
            this.csv_parser = new parsing_utils_1.CsvParser(config);
            // this.csv_separator = config.separator || ",";
            // this.csv_fields = config.fields;
            // this.csv_has_header = config.csv_has_header;
        }
        let self = this;
        let args = this.cmd_line.split(" ");
        let cmd = args[0];
        args = args.slice(1);
        this.child_process = cp.spawn(cmd, args);
        this.child_process.stdout.on("data", (data) => {
            self.handleNewData(data.toString());
        });
        callback();
    }
    handleNewData(content) {
        if (this.file_format == "json") {
            parsing_utils_1.Utils.readJsonFile(content, this.tuples);
        }
        else if (this.file_format == "csv") {
            //Utils.readCsvFile(content, this.tuples, this.csv_has_header, this.csv_separator, this.csv_fields);
            this.csv_parser.process(content, this.tuples);
        }
        else if (this.file_format == "raw") {
            parsing_utils_1.Utils.readRawFile(content, this.tuples);
        }
        else {
            throw new Error("Unsupported file format: " + this.file_format);
        }
    }
    heartbeat() { }
    shutdown(callback) {
        this.child_process.kill("SIGTERM");
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
}
exports.ProcessSpoutContinuous = ProcessSpoutContinuous;
//# sourceMappingURL=process_spout.js.map