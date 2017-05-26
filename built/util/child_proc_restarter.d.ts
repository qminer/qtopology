/** Simple class that starts child process, monitors it
 * and restarts it when it exits.
 */
export declare class ChildProcRestarter {
    private cmd_line;
    private cmd_line_args;
    private cwd;
    private proc;
    private paused;
    /** Simple constructor */
    constructor(cmd: string, args: string[], cwd?: string);
    /** Internal method for starting the child process */
    private _start();
    /** Starts child process */
    start(): void;
    /** Stops child process and doesn't restart it. */
    stop(): void;
}
