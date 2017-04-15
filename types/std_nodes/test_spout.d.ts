import * as intf from "../topology_interfaces";
/** This spout emits pre-defined tuples. Mainly used for testing. */
export declare class TestSpout implements intf.Spout {
    name: string;
    stream_id: string;
    tuples: any[];
    should_run: boolean;
    constructor();
    init(name: string, config: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
