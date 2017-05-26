"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
/** This utility method outputs data to console, clipping training new-line if present. */
function outputToConsole(data) {
    let s = data.toString();
    if (s.length > 0 && s.endsWith("\n")) {
        s = s.substring(0, s.length - 1);
    }
    console.log(s);
}
/** Simple class that starts child process, monitors it
 * and restarts it when it exits.
 */
class ChildProcRestarter {
    /** Simple constructor */
    constructor(cmd, args, cwd) {
        this.cmd_line = cmd;
        this.cmd_line_args = args;
        this.cwd = cwd;
        this.paused = true;
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
        let options = {};
        if (this.cwd) {
            options.cwd = this.cwd;
        }
        this.proc = cp.spawn(this.cmd_line, this.cmd_line_args, options);
        this.proc.stdout.on("data", outputToConsole);
        this.proc.stderr.on("data", outputToConsole);
        this.proc.on("exit", (code) => {
            delete this.proc;
            self.proc = null;
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
    stop() {
        this.paused = true;
        if (this.proc) {
            this.proc.kill("SIGINT");
        }
    }
}
exports.ChildProcRestarter = ChildProcRestarter;
//# sourceMappingURL=child_proc_restarter.js.map