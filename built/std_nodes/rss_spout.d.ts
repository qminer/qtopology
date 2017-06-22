import * as intf from "../topology_interfaces";
/** This spout periodically checks specified RSS feed and emits all items. */
export declare class RssSpout implements intf.Spout {
    private name;
    private stream_id;
    private url;
    private logging_prefix;
    private repeat;
    private should_run;
    private tuples;
    private next_call_after;
    private client;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
