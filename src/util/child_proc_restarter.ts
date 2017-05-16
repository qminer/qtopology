import * as cp from "child_process";

/** Simple class that starts child process, monitors it
 * and restarts it when it exits.
 */
export class ChildProcRestarter {

    private cmd_line: string;
    private cmd_line_args: string[];
    private proc: cp.ChildProcess;
    private paused: boolean;

    /** Simple constructor */
    constructor(cmd: string, args: string[]) {
        this.cmd_line = cmd;
        this.cmd_line_args = args;
        this.paused = true;
    }

    /** Internal method for starting the child process */
    private _start() {
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
