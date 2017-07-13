/** Simple interface that defined standard callback */
export interface SimpleCallbackChildProcRestarter {
    (error?: Error): void;
}
/** This class defines options for ChildProcessRestarter */
export declare class ChildProcRestarterOptions {
    cmd: string;
    args: string[];
    args_restart?: string[];
    cwd: string;
    use_fork: boolean;
    stop_score?: number;
}
/** Simple class that starts child process, monitors it
 * and restarts it when it exits.
 */
export declare class ChildProcRestarter {
    private cmd;
    private cmd_line_args;
    private cmd_line_args_restart;
    private cwd;
    private use_fork;
    private stop_score;
    private error_frequency_score;
    private proc;
    private paused;
    private first_start;
    private pending_exit_cb;
    /** Simple constructor */
    constructor(options: ChildProcRestarterOptions);
    /** Internal method for starting the child process */
    private _start();
    /** Starts child process */
    start(): void;
    /** Stops child process and doesn't restart it. */
    stop(cb: SimpleCallbackChildProcRestarter): void;
}
/** Simple class that starts child process, monitors it
 * and restarts it when it exits. The first argument is the executable to run.
 */
export declare class ChildProcRestarterSpawn extends ChildProcRestarter {
    /** Simple constructor */
    constructor(cmd: string, args: string[], cwd?: string);
}
/** Simple class that starts child process WITH FORK, monitors it
 * and restarts it when it exits. The first argument is the javascript file to run.
 */
export declare class ChildProcRestarterFork extends ChildProcRestarter {
    /** Simple constructor */
    constructor(cmd: string, args: string[], cwd?: string);
}
