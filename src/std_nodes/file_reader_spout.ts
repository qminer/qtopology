import * as intf from "../topology_interfaces";
import * as sh from "../util/stream_helpers";
import * as fs from "fs";
import * as cp from "child_process";
import * as rl from "readline";

const high_water = 5000;
const low_water = 50;

/** This spout reads input file in several supported formats and emits tuples. */
export class FileReaderSpout2 implements intf.Spout {

    private name: string;
    private stream_id: string;
    private file_format: string;
    private file_name: string;
    private csv_separator: string;
    private csv_fields: string[];
    private csv_header: string[];
    private tuples: any[];
    private should_run: boolean;

    constructor() {
        this.name = null;
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.file_name = null;
        this.should_run = false;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.stream_id = config.stream_id;
        this.file_name = config.file_name;
        this.file_format = config.file_format || "json";
        this.tuples = [];
        if (this.file_format == "csv") {
            this.csv_separator = config.separator || ",";
            this.csv_fields = config.fields;
        }

        sh.importFileByLine(
            this.file_name,
            {
                addLine: (line: string) => {
                    if (this.file_format == "json") {
                        this.processLineJson(line);
                    } else if (this.file_format == "csv") {
                        this.processLineCsv(line);
                    } else if (this.file_format == "raw") {
                        this.processLineRaw(line);
                    }
                }
            },
            null
        );
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

    private processLineJson(content: string) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length == 0) continue;
            this.tuples.push(JSON.parse(line));
        }
    }

    private processLineRaw(content: string) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0) return;
            this.tuples.push({ content: line });
        }
    }

    private processLineCsv(line: string) {
        if (!this.csv_header) {
            this.csv_header = line.split(this.csv_separator);
            return;
        } else {
            line = line.trim();
            if (line.length == 0) return;
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

/** This spout reads input file in several supported formats and emits tuples. */
export class FileReaderSpout implements intf.Spout {

    private name: string;
    private stream_id: string;
    private file_format: string;
    private file_name: string;
    private csv_separator: string;
    private csv_fields: string[];
    private csv_header: string[];
    private tuples: any[];
    private should_run: boolean;
    private line_reader: rl.ReadLine;
    private line_reader_paused: boolean;

    constructor() {
        this.name = null;
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.file_name = null;
        this.should_run = false;
        this.line_reader_paused = false;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
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
            } else if (this.file_format == "csv") {
                this.processLineCsv(line);
            } else if (this.file_format == "raw") {
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

    private processLineJson(content: string) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length == 0) continue;
            this.tuples.push(JSON.parse(line));
        }
    }

    private processLineRaw(content: string) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0) return;
            this.tuples.push({ content: line });
        }
    }

    private processLineCsv(line: string) {
        if (!this.csv_header) {
            this.csv_header = line.split(this.csv_separator);
            return;
        } else {
            line = line.trim();
            if (line.length == 0) return;
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
