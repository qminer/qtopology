import * as intf from "../topology_interfaces";
/** This spout emits single tuple each heartbeat */
export declare class TimerSpout implements intf.Spout {
    name: string;
    stream_id: string;
    title: string;
    should_run: boolean;
    extra_fields: any;
    next_tuple: any;
    constructor();
    init(name: string, config: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
