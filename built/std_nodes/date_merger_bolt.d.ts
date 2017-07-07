import * as intf from "../topology_interfaces";
/** This bolt merges several streams of data
 * so that they are interleaved with respect to specific field value. */
export declare class DateMergerBolt implements intf.Bolt {
    private name;
    private stream_id;
    private comparison_field;
    private initial_delay;
    private in_initial_delay;
    private in_call;
    private onEmit;
    private wait_list;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
    executeStep(): void;
}
