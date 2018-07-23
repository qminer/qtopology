import * as intf from "../topology_interfaces";
/** This spout executes specified process, collects its stdout, parses it and emits tuples. */
export declare class ProcessSpout implements intf.Spout {
    private stream_id;
    private cmd_line;
    private file_format;
    private csv_parser;
    private tuples;
    private should_run;
    private next_run;
    private run_interval;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    private runProcessAndCollectOutput;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
/** This spout spawns specified process and starts collecting its stdout, parsing it and emiting the tuples. */
export declare class ProcessSpoutContinuous implements intf.Spout {
    private stream_id;
    private cmd_line;
    private cwd;
    private file_format;
    private emit_parse_errors;
    private emit_stderr_errors;
    private emit_error_on_exit;
    private csv_parser;
    private tuples;
    private should_run;
    private child_process;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    private handleNewData;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
