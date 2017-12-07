import * as intf from "../topology_interfaces";
import * as cp from "child_process";
import * as async from "async";
import { Utils } from "./parsing_utils";
import { logger } from "../index";

/** This bolt spawns specified process and communicates with it using stdin and stdout.
 * Tuples are serialized into JSON. */
export class ProcessBoltContinuous implements intf.Bolt {

    private stream_id: string;
    private cmd_line: string;
    private tuples: any[];
    private onEmit: intf.BoltEmitCallback;
    private child_process: cp.ChildProcess;

    constructor() {
        this.stream_id = null;
        this.tuples = null;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
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
            logger().log("child process closed");
        });
        callback();
    }

    private handleNewData(content: string) {
        let self = this;
        Utils.readJsonFile(content, this.tuples);
        let tmp_tuples = this.tuples;
        this.tuples = [];
        async.eachSeries(
            tmp_tuples,
            (tuple, callback) => {
                try {
                    self.onEmit(tuple, self.stream_id, (err) => {
                        if (err) {
                            logger().error("Error in process-bolt emit (1)");
                            logger().exception(err);
                        }
                        callback();
                    });
                } catch (err) {
                    logger().error("Error in process-bolt emit (2)");
                    logger().exception(err);
                    callback();
                }
            },
            () => { }
        );
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        this.child_process.kill("SIGTERM");
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        if (!this.child_process) {
            return callback(new Error("Child process died, cannot receive new data"));
        }
        this.child_process.stdin.write(JSON.stringify(data) + "\n");
        callback();
    }
}
