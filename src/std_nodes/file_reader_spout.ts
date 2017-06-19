import * as intf from "../topology_interfaces";
import * as fs from "fs";

/** This spout reads input file in several supported formats and emits tuples. */
export class FileReaderSpout implements intf.Spout {

    private name: string;
    private stream_id: string;
    private file_name: string;
    private file_format: string;
    private csv_separator: string;
    private csv_fields: string[];
    private tuples: any[];
    private should_run: boolean;

    constructor() {
        this.name = null;
        this.stream_id = null;
        this.file_name = null;
        this.file_format = null;
        this.tuples = null;
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

        let content = fs.readFileSync(this.file_name, "utf8");
        if (this.file_format == "json") {
            this.readJsonFile(content);
        } else if (this.file_format == "csv") {
            this.readCsvFile(content);
        } else if (this.file_format == "raw") {
            this.readRawFile(content);
        } else {
            callback(new Error("Unsupported file format: " + this.file_format));
        }

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

    private readJsonFile(content: string) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length == 0) continue;
            this.tuples.push(JSON.parse(line));
        }
    }

    private readRawFile(content: string) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0) continue;
            this.tuples.push({ content: line });
        }
    }

    private readCsvFile(content: string) {
        let lines = content.split("\n");

        let header = lines[0].replace("\r", "");
        let fields = header.split(this.csv_separator);

        lines = lines.slice(1);
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0) continue;
            let values = line.split(this.csv_separator);
            let result = {};
            for (let i = 0; i < fields.length; i++) {
                result[fields[i]] = values[i];
            }
            this.tuples.push(result);
        }
    }
}
