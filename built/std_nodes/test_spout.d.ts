import * as intf from "../topology_interfaces";
/** This spout emits pre-defined tuples. Mainly used for testing. */
export declare class TestSpout implements intf.Spout {
    private name;
    private stream_id;
    private tuples;
    private should_run;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
