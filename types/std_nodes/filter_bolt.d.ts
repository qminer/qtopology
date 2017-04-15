import * as intf from "../topology_interfaces";
import * as pm from "../util/pattern_matcher";
/** This bolt filters incoming messages based on provided
 * filter and sends them forward. */
export declare class FilterBolt implements intf.Bolt {
    name: string;
    matcher: pm.PaternMatcher;
    onEmit: intf.BoltEmitCallback;
    constructor();
    /** Initializes filtering pattern */
    init(name: string, config: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
