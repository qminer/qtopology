"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
/** Simple class that starts child process, monitors it
 * and restarts it when it exits.
 */
class ChildProcRestarter {
    /** Simple constructor */
    constructor(cmd, args) {
        this.cmd_line = cmd;
        this.cmd_line_args = args;
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
        this.proc = cp.spawn(this.cmd_line, this.cmd_line_args);
        this.proc.stdout.on("data", (data) => { console.log(data.toString()); });
        this.proc.stderr.on("data", (data) => { console.log(data.toString()); });
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