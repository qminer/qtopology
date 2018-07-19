import * as intf from "../topology_interfaces";
/** This bolt transforms incoming messages
 * into predefined format. */
export declare class TransformBolt implements intf.Bolt {
    private onEmit;
    private compiled;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
    private precompile;
}
