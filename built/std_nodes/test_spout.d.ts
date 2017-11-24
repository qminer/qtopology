import * as intf from "../topology_interfaces";
/** This spout emits pre-defined tuples. Mainly used for testing. */
export declare class TestSpout implements intf.Spout {
    private stream_id;
    private tuples;
    private delay_start;
    private delay_between;
    private ts_next_emit;
    private should_run;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
