import * as cp from "child_process";
import * as fe from "./freq_estimator";
import * as logger from "./logger";

/** Simple interface that defined standard callback */
export type SimpleCallbackChildProcRestarter = (error?: Error) => void;

/** This utility method outputs data to console, clipping training new-line if present. */
function outputToConsole(data) {
    let s = data.toString() as string;
    if (s.length > 0 && s.endsWith("\n")) {
        s = s.substring(0, s.length - 1);
    }
    console.log(s);
}

/** This class defines options for ChildProcessRestarter */
export class ChildProcRestarterOptions {
    public cmd: string;
    public args: string[];
    public args_restart?: string[];
    public cwd: string;
    public use_fork: boolean;
    public stop_score?: number;
}

/** Simple class that starts child process, monitors it
 * and restarts it when it exits.
 */
export class ChildProcRestarter {

    private cmd: string;
    private cmd_line_args: string[];
    private cmd_line_args_restart: string[];
    private cwd: string;
    private use_fork: boolean;
    private stop_score: number;
    private error_frequency_score: fe.EventFrequencyScore;
    private proc: cp.ChildProcess;
    private paused: boolean;
    private first_start: boolean;
    private pending_exit_cb: SimpleCallbackChildProcRestarter;

    /** Simple constructor */
    constructor(options: ChildProcRestarterOptions) {
        this.cmd = options.cmd;
        this.cmd_line_args = options.args;
        this.cmd_line_args_restart = options.args_restart || options.args;
        this.cwd = options.cwd;
        this.use_fork = options.use_fork;
        this.paused = true;
        this.first_start = true;
        if (options.stop_score > 0) {
            this.stop_score = options.stop_score;
            this.error_frequency_score = new fe.EventFrequencyScore(options.stop_score * 60 * 1000);
        }
    }

    /** Starts child process */
    public start() {
        this.paused = false;
        this._start();
    }

    /** Stops child process and doesn't restart it. */
    public stop(cb: SimpleCallbackChildProcRestarter) {
        this.paused = true;
        this.pending_exit_cb = cb || (() => {
            // no-op
        });
        if (this.proc) {
            this.proc.kill("SIGINT");
        }
    }

    /** Internal method for starting the child process */
    private _start() {
        const self = this;
        if (this.proc) {
            return;
        }
        if (this.paused) {
            return;
        }
        let args = this.cmd_line_args_restart;
        if (this.first_start) {
            this.first_start = false;
            args = this.cmd_line_args;
        }
        if (this.use_fork) {
            const options = {} as cp.ForkOptions;
            options.silent = false;
            if (this.cwd) {
                options.cwd = this.cwd;
            }
            this.proc = cp.fork(this.cmd, args, options);
        } else {
            const options = {} as cp.SpawnOptions;
            if (this.cwd) {
                options.cwd = this.cwd;
            }
            this.proc = cp.spawn(this.cmd, args, options);
            this.proc.stdout.on("data", outputToConsole);
            this.proc.stderr.on("data", outputToConsole);
        }
        this.proc.on("exit", () => {
            delete this.proc;
            self.proc = null;
            if (self.pending_exit_cb) {
                self.pending_exit_cb();
                return;
            }
            if (this.stop_score) {
                // check if topology restarted a lot recently
                const score = this.error_frequency_score.add(new Date());
                const too_often = (score >= this.stop_score);
                if (too_often) {
                    logger.logger().error(`Child process restarted too often ${this.cmd} ${this.cmd_line_args}`);
                    logger.logger().error(`Stopping restart`);
                    return;
                }
            }
            logger.logger().warn(`Restarting child process ${this.cmd} ${this.cmd_line_args}`);
            setTimeout(() => {
                self._start();
            }, 1000);
        });
    }
}

/** Simple class that starts child process, monitors it
 * and restarts it when it exits. The first argument is the executable to run.
 */
export class ChildProcRestarterSpawn extends ChildProcRestarter {

    /** Simple constructor */
    constructor(cmd: string, args: string[], cwd?: string) {
        super({ cmd, args, cwd, use_fork: false });
    }
}

/** Simple class that starts child process WITH FORK, monitors it
 * and restarts it when it exits. The first argument is the javascript file to run.
 */
export class ChildProcRestarterFork extends ChildProcRestarter {

    /** Simple constructor */
    constructor(cmd: string, args: string[], cwd?: string) {
        super({ cmd, args, cwd, use_fork: true });
    }
}
