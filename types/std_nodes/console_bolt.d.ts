import * as intf from "../topology_interfaces";
/** This bolt just writes all incoming data to console. */
export declare class ConsoleBolt implements intf.Bolt {
    name: string;
    prefix: string;
    onEmit: intf.BoltEmitCallback;
    constructor();
    init(name: string, config: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
