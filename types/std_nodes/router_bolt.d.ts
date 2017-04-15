import * as intf from "../topology_interfaces";
/** This bolt routs incoming messages based on provided
 * queries and sends them forward using mapped stream ids. */
export declare class RouterBolt implements intf.Bolt {
    name: string;
    matchers: any[];
    onEmit: intf.BoltEmitCallback;
    /** Simple constructor */
    constructor();
    /** Initializes routing patterns */
    init(name: string, config: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
