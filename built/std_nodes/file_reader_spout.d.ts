import * as intf from "../topology_interfaces";
/** This spout reads input file in several supported formats and emits tuples. */
export declare class FileReaderSpout implements intf.Spout {
    private name;
    private stream_id;
    private file_format;
    private file_name;
    private csv_separator;
    private csv_fields;
    private csv_header;
    private tuples;
    private should_run;
    private line_reader;
    private line_reader_paused;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
    private processLineJson(content);
    private processLineRaw(content);
    private processLineCsv(line);
}
