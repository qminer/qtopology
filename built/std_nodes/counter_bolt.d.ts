import * as intf from "../topology_interfaces";
/** This bolt counts incoming data and outputs statistics
 * to console and emits it as message to listeners. */
export declare class CounterBolt implements intf.Bolt {
    private name;
    private prefix;
    private timeout;
    private last_output;
    private counter;
    private onEmit;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
