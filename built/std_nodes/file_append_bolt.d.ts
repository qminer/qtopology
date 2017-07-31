import * as intf from "../topology_interfaces";
/** This bolt writes incoming messages to file. */
export declare class FileAppendBolt implements intf.Bolt {
    private name;
    private file_name_current;
    private file_name_template;
    private current_data;
    private prepend_timestamp;
    private split_over_time;
    private split_period;
    private next_split_after;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    private toISOFormatLocal(d);
    private fileNameTimestampValue();
    private writeToFile(callback);
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
