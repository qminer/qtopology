import * as intf from "../topology_interfaces";
import * as cp from "child_process";
import { Utils, CsvParser } from "./parsing_utils";
import { logger } from "../index";

/** This spout executes specified process, collects its stdout, parses it and emits tuples. */
export class ProcessSpout implements intf.ISpout {

    private stream_id: string;
    private cmd_line: string;
    private file_format: string;
    private csv_parser: CsvParser;
    private tuples: any[];
    private should_run: boolean;

    private next_run: number;
    private run_interval: number;

    constructor() {
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.should_run = false;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.stream_id = config.stream_id;
        this.cmd_line = config.cmd_line;
        this.file_format = config.file_format || "json";
        this.tuples = [];
        if (this.file_format == "csv") {
            config.separator = config.separator || ",";
            this.csv_parser = new CsvParser(config);
        }
        if (config.run_interval) {
            // kick-off perpetual periodic execution
            this.run_interval = config.run_interval;
            this.next_run = Number.MIN_VALUE;
            callback();
        } else {
            // run only once - now
            this.next_run = Number.MAX_VALUE;
            this.runProcessAndCollectOutput(callback);
        }
    }

    public heartbeat() {
        const d = Date.now();
        if (d >= this.next_run) {
            this.next_run = d + this.run_interval;
            this.runProcessAndCollectOutput(err => {
                if (!err) {
                    return;
                }
                logger().error("Error while running child process");
                logger().exception(err);
            });
        }
    }

    public shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    public run() {
        this.should_run = true;
    }

    public pause() {
        this.should_run = false;
    }

    public next(callback: intf.SpoutNextCallback) {
        if (!this.should_run) {
            return callback(null, null, null);
        }
        if (this.tuples.length === 0) {
            return callback(null, null, null);
        }
        const data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        callback(null, data, this.stream_id);
    }

    private runProcessAndCollectOutput(callback: intf.SimpleCallback) {
        let args = this.cmd_line.split(" ");
        const cmd = args[0];
        args = args.slice(1);
        const content2 = cp.spawnSync(cmd, args).output[1];
        const content = content2.toString();
        if (this.file_format == "json") {
            Utils.readJsonFile(content, this.tuples);
        } else if (this.file_format == "csv") {
            this.csv_parser.process(content, this.tuples);
        } else if (this.file_format == "raw") {
            Utils.readRawFile(content, this.tuples);
        } else {
            callback(new Error("Unsupported file format: " + this.file_format));
        }
        callback();
    }
}

/** This spout spawns specified process and starts collecting its stdout, parsing it and emiting the tuples. */
export class ProcessSpoutContinuous implements intf.ISpout {

    private stream_id: string;
    private cmd_line: string;
    private cwd: string;
    private file_format: string;
    private emit_parse_errors: boolean;
    private emit_stderr_errors: boolean;
    private emit_error_on_exit: boolean;
    private csv_parser: CsvParser;
    private tuples: any[];
    private should_run: boolean;
    private child_process: cp.ChildProcess;

    constructor() {
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.should_run = false;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.stream_id = config.stream_id;
        this.cmd_line = config.cmd_line;
        this.cwd = config.cwd || null;
        this.file_format = config.file_format || "json";
        this.emit_parse_errors = config.emit_parse_errors != null ? config.emit_parse_errors : true;
        this.emit_stderr_errors = config.emit_stderr_errors != null ? config.emit_stderr_errors : false;
        this.emit_error_on_exit = config.emit_error_on_exit != null ? config.emit_error_on_exit : false;
        this.tuples = [];
        if (this.file_format == "csv") {
            config.separator = config.separator || ",";
            this.csv_parser = new CsvParser(config);
        }

        let args = this.cmd_line.split(" ");
        const cmd = args[0];
        args = args.slice(1);
        this.child_process = cp.spawn(cmd, args, { cwd: this.cwd });
        this.child_process.stdout.on("data", data => {
            // errors will be pushed to tuples if emit_parse_errors is true
            this.handleNewData(data.toString());
        });
        this.child_process.stderr.on("data", data => {
            // errors will be pushed to tuples if emit_parse_errors is true
            if (this.emit_stderr_errors) {
                this.tuples = [new Error(data.toString())];
            }
        });
        this.child_process.on("error", error => {
            this.tuples = [error];
        });
        this.child_process.on("close", (code, signal) => {
            if (this.emit_error_on_exit) {
                if (code != null) {
                    this.tuples = [new Error("Child process exited with code " + code)];
                } else {
                    this.tuples = [new Error("Child process exited, got signal " + signal)];
                }
            }
        });
        callback();
    }

    public heartbeat() {
        // no-op
    }

    public shutdown(callback: intf.SimpleCallback) {
        this.child_process.kill("SIGTERM");
        callback();
    }

    public run() {
        this.should_run = true;
    }

    public pause() {
        this.should_run = false;
    }

    public next(callback: intf.SpoutNextCallback) {
        if (!this.should_run) {
            return callback(null, null, null);
        }
        if (this.tuples.length === 0) {
            return callback(null, null, null);
        }
        const data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        if (data instanceof Error) {
            callback(data, null, this.stream_id);
        } else {
            callback(null, data, this.stream_id);
        }
    }

    private handleNewData(content: string) {
        if (this.file_format == "json") {
            Utils.readJsonFile(content, this.tuples, this.emit_parse_errors);
        } else if (this.file_format == "csv") {
            this.csv_parser.process(content, this.tuples);
        } else if (this.file_format == "raw") {
            Utils.readRawFile(content, this.tuples);
        } else {
            throw new Error("Unsupported file format: " + this.file_format);
        }
    }
}
