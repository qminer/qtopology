import * as intf from "../topology_interfaces";
/** This spout sends GET request to the specified url in regular
 * time intervals and forwards the result.
 * */
export declare class GetSpout implements intf.Spout {
    private stream_id;
    private url;
    private repeat;
    private should_run;
    private next_tuple;
    private next_ts;
    private client;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
