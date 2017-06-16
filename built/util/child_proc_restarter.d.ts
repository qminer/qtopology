/** Simple interface that defined standard callback */
export interface SimpleCallbackChildProcRestarter {
    (error?: Error): void;
}
/** Simple class that starts child process, monitors it
 * and restarts it when it exits.
 */
export declare class ChildProcRestarterInner {
    private cmd;
    private cmd_line_args;
    private cwd;
    private use_fork;
    private proc;
    private paused;
    private pending_exit_cb;
    /** Simple constructor */
    constructor(cmd: string, args: string[], cwd: string, use_fork: boolean);
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
export declare class ChildProcRestarter extends ChildProcRestarterInner {
    /** Simple constructor */
    constructor(cmd: string, args: string[], cwd?: string);
}
/** Simple class that starts child process WITH FORK, monitors it
 * and restarts it when it exits. The first argument is the javascript file to run.
 */
export declare class ChildProcRestarterFork extends ChildProcRestarterInner {
    /** Simple constructor */
    constructor(cmd: string, args: string[], cwd?: string);
}
