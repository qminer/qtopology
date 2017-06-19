import * as intf from "../topology_interfaces";
/** This spout starts given process and reads its stdout.
 * The emitted texts in several supported formats and emits tuples. */
export declare class ProcessSpout implements intf.Spout {
    private name;
    private stream_id;
    private cmd_line;
    private file_format;
    private csv_separator;
    private csv_fields;
    private tuples;
    private should_run;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
    private readJsonFile(content);
    private readRawFile(content);
    private readCsvFile(content);
}
