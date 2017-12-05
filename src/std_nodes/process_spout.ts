import * as intf from "../topology_interfaces";
import * as cp from "child_process";
import { Utils } from "./parsing_utils";

/** This spout executes specified process, collects its stdout, parses it and emits tuples. */
export class ProcessSpout implements intf.Spout {

    private stream_id: string;
    private cmd_line: string;
    private file_format: string;
    private csv_separator: string;
    private csv_fields: string[];
    private csv_has_header: boolean;
    private tuples: any[];
    private should_run: boolean;

    constructor() {
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.should_run = false;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.stream_id = config.stream_id;
        this.cmd_line = config.cmd_line;
        this.file_format = config.file_format || "json";
        this.tuples = [];
        if (this.file_format == "csv") {
            this.csv_separator = config.separator || ",";
            this.csv_fields = config.fields;
            this.csv_has_header = config.csv_has_header;
        }

        this.runProcessAndCollectOutput(callback);
    }

    private runProcessAndCollectOutput(callback: intf.SimpleCallback) {
        let args = this.cmd_line.split(" ");
        let cmd = args[0];
        args = args.slice(1);
        let content2 = cp.spawnSync(cmd, args).output[1];
        let content = content2.toString();
        if (this.file_format == "json") {
            Utils.readJsonFile(content, this.tuples);
        } else if (this.file_format == "csv") {
            Utils.readCsvFile(content, this.tuples, this.csv_has_header, this.csv_separator, this.csv_fields);
        } else if (this.file_format == "raw") {
            Utils.readRawFile(content, this.tuples);
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
}

/** This spout spawns specified process and starts collecting its stdout, parsing it and emiting the tuples. */
export class ProcessSpoutContinuous implements intf.Spout {

    //private name: string;
    private stream_id: string;
    private cmd_line: string;
    private file_format: string;
    private csv_separator: string;
    private csv_fields: string[];
    private csv_has_header: boolean;
    private tuples: any[];
    private should_run: boolean;
    private child_process: cp.ChildProcess;

    constructor() {
        //this.name = null;
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.should_run = false;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
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

    private handleNewData(content: string) {
        if (this.file_format == "json") {
            Utils.readJsonFile(content, this.tuples);
        } else if (this.file_format == "csv") {
            Utils.readCsvFile(content, this.tuples, this.csv_has_header, this.csv_separator, this.csv_fields);
        } else if (this.file_format == "raw") {
            Utils.readRawFile(content, this.tuples);
        } else {
            throw new Error("Unsupported file format: " + this.file_format);
        }
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        this.child_process.kill("SIGTERM");
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
}
