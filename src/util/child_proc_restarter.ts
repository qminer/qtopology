import * as cp from "child_process";

/** This utility method outputs data to console, clipping training new-line if present. */
function outputToConsole(data) {
    let s = data.toString() as string;
    if (s.length > 0 && s.endsWith("\n")) {
        s = s.substring(0, s.length - 1);
    }
    console.log(s);
}

/** Simple class that starts child process, monitors it
 * and restarts it when it exits.
 */
export class ChildProcRestarter {

    private cmd_line: string;
    private cmd_line_args: string[];
    private cwd: string
    private proc: cp.ChildProcess;
    private paused: boolean;

    /** Simple constructor */
    constructor(cmd: string, args: string[], cwd?: string) {
        this.cmd_line = cmd;
        this.cmd_line_args = args;
        this.cwd = cwd;
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
        let options = {} as cp.SpawnOptions;
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

