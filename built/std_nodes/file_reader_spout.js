"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const rl = require("readline");
const log = require("../util/logger");
const parsing_utils_1 = require("./parsing_utils");
const high_water = 5000;
const low_water = 50;
/** This spout reads input file in several supported formats and emits tuples. */
class FileReaderSpout {
    constructor() {
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.file_name = null;
        this.should_run = false;
        this.line_reader_paused = false;
    }
    init(name, config, context, callback) {
        this.stream_id = config.stream_id;
        this.file_name = config.file_name;
        this.file_format = config.file_format || "json";
        this.tuples = [];
        if (this.file_format == "csv") {
            config.separator = config.separator || ",";
            this.csv_parser = new parsing_utils_1.CsvParser(config);
        }
        log.logger().log(`Reading file ${this.file_name}`);
        this.line_reader = rl.createInterface({ input: fs.createReadStream(this.file_name) });
        this.line_reader.on('line', (line) => {
            if (this.file_format == "json") {
                parsing_utils_1.Utils.readJsonFile(line, this.tuples);
            }
            else if (this.file_format == "csv") {
                this.csv_parser.process(line, this.tuples);
            }
            else if (this.file_format == "raw") {
                parsing_utils_1.Utils.readRawFile(line, this.tuples);
            }
            if (this.tuples.length > high_water && !this.line_reader_paused) {
                this.line_reader.pause();
                this.line_reader_paused = true;
            }
        });
        this.line_reader.on("close", () => {
            log.logger().log(`Reached the end of file ${this.file_name}`);
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
            this.line_reader_paused = false;
        }
        if (this.tuples.length === 0) {
            return callback(null, null, null);
        }
        let data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        let self = this;
        setImmediate(() => {
            callback(null, data, self.stream_id);
        });
    }
}
exports.FileReaderSpout = FileReaderSpout;
//# sourceMappingURL=file_reader_spout.js.map