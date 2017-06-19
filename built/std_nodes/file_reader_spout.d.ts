import * as intf from "../topology_interfaces";
/** This spout reads input file in several supported formats and emits tuples. */
export declare abstract class StringReaderSpout implements intf.Spout {
    private name;
    private stream_id;
    private file_format;
    private csv_separator;
    private csv_fields;
    private tuples;
    private should_run;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    abstract getContent(): string;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
    private readJsonFile(content);
    private readRawFile(content);
    private readCsvFile(content);
}
/** This spout reads input file in several supported formats and emits tuples. */
export declare class FileReaderSpout extends StringReaderSpout {
    private file_name;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    getContent(): string;
}
/** This spout reads input file in several supported formats and emits tuples. */
export declare class ProcessSpout extends StringReaderSpout {
    private cmd_line;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    getContent(): string;
}
