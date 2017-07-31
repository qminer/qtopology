import * as intf from "../topology_interfaces";
/** This bolt filters incoming messages based on provided
 * filter and sends them forward. */
export declare class FilterBolt implements intf.Bolt {
    private name;
    private matcher;
    private onEmit;
    constructor();
    /** Initializes filtering pattern */
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
