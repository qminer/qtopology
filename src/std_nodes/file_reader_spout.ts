import * as intf from "../topology_interfaces";
import * as fs from "fs";
import * as rl from "readline";
import * as log from "../util/logger";
import { Utils, CsvParser } from "./parsing_utils";

const high_water = 5000;
const low_water = 50;

/** This spout reads input file in several supported formats and emits tuples. */
export class FileReaderSpout implements intf.Spout {

    private stream_id: string;
    private file_format: string;
    private file_name: string;
    private csv_parser: CsvParser;
    private tuples: any[];
    private should_run: boolean;
    private line_reader: rl.ReadLine;
    private line_reader_paused: boolean;
    private own_exit: boolean;
    private own_exit_delay: number;

    constructor() {
        this.stream_id = null;
        this.file_format = null;
        this.tuples = null;
        this.file_name = null;
        this.should_run = false;
        this.line_reader_paused = false;
        this.own_exit = false;
        this.own_exit_delay = 0;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.stream_id = config.stream_id;
        this.file_name = config.file_name;
        this.file_format = config.file_format || "json";
        this.tuples = [];
        if (this.file_format == "csv") {
            config.separator = config.separator || ","
            this.csv_parser = new CsvParser(config);
        }
        this.own_exit = config.own_exit;
        this.own_exit_delay = +config.own_exit_delay || 10000; // default own-exit delay is 10 sec

        log.logger().log(`Reading file ${this.file_name}`);
        this.line_reader = rl.createInterface({ input: fs.createReadStream(this.file_name) });
        this.line_reader.on('line', (line) => {
            if (this.file_format == "json") {
                Utils.readJsonFile(line, this.tuples);
            } else if (this.file_format == "csv") {
                this.csv_parser.process(line, this.tuples);
            } else if (this.file_format == "raw") {
                Utils.readRawFile(line, this.tuples);
            }
            if (this.tuples.length > high_water && !this.line_reader_paused) {
                this.line_reader.pause();
                this.line_reader_paused = true;
            }
        });
        this.line_reader.on("close", () => {
            log.logger().log(`Reached the end of file ${this.file_name}`);
            if (this.own_exit) {
                setTimeout(() => {
                    // send Ctrl+C to self
                    process.kill(process.pid, "SIGTERM");
                }, this.own_exit_delay);
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
