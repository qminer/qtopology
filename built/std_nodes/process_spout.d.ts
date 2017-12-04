import * as intf from "../topology_interfaces";
export declare class Utils {
    static readJsonFile(content: string, tuples: any[]): void;
    static readRawFile(content: string, tuples: any[]): void;
    static readCsvFile(content: string, tuples: any[], csv_has_header: boolean, csv_separator: string, csv_fields: string[]): void;
}
/** This spout executes specified process, collects its stdout, parses it and emits tuples. */
export declare class ProcessSpout implements intf.Spout {
    private stream_id;
    private cmd_line;
    private file_format;
    private csv_separator;
    private csv_fields;
    private csv_has_header;
    private tuples;
    private should_run;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    private runProcessAndCollectOutput(callback);
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
