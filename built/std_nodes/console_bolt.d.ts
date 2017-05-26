import * as intf from "../topology_interfaces";
/** This bolt just writes all incoming data to console. */
export declare class ConsoleBolt implements intf.Bolt {
    private name;
    private prefix;
    private onEmit;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
