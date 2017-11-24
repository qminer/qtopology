import * as intf from "../topology_interfaces";
/** This spout emits single tuple each heartbeat */
export declare class TimerSpout implements intf.Spout {
    private stream_id;
    private title;
    private should_run;
    private extra_fields;
    private next_tuple;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
