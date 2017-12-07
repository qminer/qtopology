"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const async = require("async");
const parsing_utils_1 = require("./parsing_utils");
const index_1 = require("../index");
/** This bolt spawns specified process and communicates with it using stdin and stdout.
 * Tuples are serialized into JSON. */
class ProcessBoltContinuous {
    constructor() {
        this.stream_id = null;
        this.tuples = null;
    }
    init(name, config, context, callback) {
        this.stream_id = config.stream_id;
        this.onEmit = config.onEmit;
        this.cmd_line = config.cmd_line;
        this.tuples = [];
        let self = this;
        let args = this.cmd_line.split(" ");
        let cmd = args[0];
        args = args.slice(1);
        this.child_process = cp.spawn(cmd, args);
        this.child_process.stdout.on("data", (data) => {
            self.handleNewData(data.toString());
        });
        this.child_process.on("exit", () => {
            this.child_process = null;
            index_1.logger().log("child process closed");
        });
        callback();
    }
    handleNewData(content) {
        let self = this;
        parsing_utils_1.Utils.readJsonFile(content, this.tuples);
        let tmp_tuples = this.tuples;
        this.tuples = [];
        async.eachSeries(tmp_tuples, (tuple, callback) => {
            try {
                self.onEmit(tuple, self.stream_id, (err) => {
                    if (err) {
                        index_1.logger().error("Error in process-bolt emit (1)");
                        index_1.logger().exception(err);
                    }
                    callback();
                });
            }
            catch (err) {
                index_1.logger().error("Error in process-bolt emit (2)");
                index_1.logger().exception(err);
                callback();
            }
        }, () => { });
    }
    heartbeat() { }
    shutdown(callback) {
        this.child_process.kill("SIGTERM");
        callback();
    }
    receive(data, stream_id, callback) {
        if (!this.child_process) {
            return callback(new Error("Child process died, cannot receive new data"));
        }
        this.child_process.stdin.write(JSON.stringify(data) + "\n");
        callback();
    }
}
exports.ProcessBoltContinuous = ProcessBoltContinuous;
//# sourceMappingURL=process_bolt.js.map