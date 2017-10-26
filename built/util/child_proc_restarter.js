"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const fe = require("./freq_estimator");
const logger = require("./logger");
/** This utility method outputs data to console, clipping training new-line if present. */
function outputToConsole(data) {
    let s = data.toString();
    if (s.length > 0 && s.endsWith("\n")) {
        s = s.substring(0, s.length - 1);
    }
    console.log(s);
}
/** This class defines options for ChildProcessRestarter */
class ChildProcRestarterOptions {
}
exports.ChildProcRestarterOptions = ChildProcRestarterOptions;
/** Simple class that starts child process, monitors it
 * and restarts it when it exits.
 */
class ChildProcRestarter {
    /** Simple constructor */
    constructor(options) {
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
    /** Internal method for starting the child process */
    _start() {
        let self = this;
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
            let options = {};
            options.silent = false;
            if (this.cwd) {
                options.cwd = this.cwd;
            }
            this.proc = cp.fork(this.cmd, args, options);
        }
        else {
            let options = {};
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
                let score = this.error_frequency_score.add(new Date());
                let too_often = (score >= this.stop_score);
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
    /** Starts child process */
    start() {
        this.paused = false;
        this._start();
    }
    /** Stops child process and doesn't restart it. */
    stop(cb) {
        this.paused = true;
        this.pending_exit_cb = cb || (() => { });
        if (this.proc) {
            this.proc.kill("SIGINT");
        }
    }
}
exports.ChildProcRestarter = ChildProcRestarter;
/** Simple class that starts child process, monitors it
 * and restarts it when it exits. The first argument is the executable to run.
 */
class ChildProcRestarterSpawn extends ChildProcRestarter {
    /** Simple constructor */
    constructor(cmd, args, cwd) {
        super({ cmd: cmd, args: args, cwd: cwd, use_fork: false });
    }
}
exports.ChildProcRestarterSpawn = ChildProcRestarterSpawn;
/** Simple class that starts child process WITH FORK, monitors it
 * and restarts it when it exits. The first argument is the javascript file to run.
 */
class ChildProcRestarterFork extends ChildProcRestarter {
    /** Simple constructor */
    constructor(cmd, args, cwd) {
        super({ cmd: cmd, args: args, cwd: cwd, use_fork: true });
    }
}
exports.ChildProcRestarterFork = ChildProcRestarterFork;
//# sourceMappingURL=child_proc_restarter.js.map