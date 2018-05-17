import * as intf from "../topology_interfaces";
/** Internal class for storing statistics */
export declare class Rec {
    count: number;
    min: number;
    max: number;
    avg: number;
    constructor();
    reset(): void;
    add(val: number): void;
    report(): {
        min: number;
        max: number;
        avg: number;
        count: number;
    };
}
/** Internal class that lives in a tree structure */
export declare class Node {
    data: Rec;
    children: any;
    constructor();
    add(val: number, tags: string[], tag_index: number): void;
    report(prefix: string, result: any): void;
    reset(): void;
}
/** This class processes incoming single-metric data by counting and keeping various statistics
 * about it, and then publishing it when requested. */
export declare class Accumulator {
    private map;
    name: string;
    constructor(name: string);
    add(val: number, tags: string[]): void;
    report(): any[];
    reset(): void;
}
/** This bolt processes incoming data by counting and keeping various statistics
 * about it, and then publishing them at regular intervals. */
export declare class AccumulatorBolt implements intf.Bolt {
    private last_ts;
    private granularity;
    private onEmit;
    private accumulators;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
    catchUpTimestamp(ts: any, callback: any): void;
    sendAggregates(callback: any): void;
}
