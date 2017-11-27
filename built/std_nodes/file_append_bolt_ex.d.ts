import * as intf from "../topology_interfaces";
/** This bolt writes incoming messages to file. Data is split into
 * several files/buckets, based on the value of a specific field.
 * Also, data is grouped into files based on timestamp field.
 * ASSUMPTION: The data is sequential with respect to timestamp (within each bucket)
 */
export declare class FileAppendBoltEx implements intf.Bolt {
    private name;
    private log_prefix;
    private file_name_template;
    private split_period;
    private split_by_field;
    private timestamp_field;
    private buckets;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
