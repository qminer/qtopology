import * as intf from "../topology_interfaces";
/** This bolt sends POST request to specified url (fixed or provided inside data)
 * and forwards the request. */
export declare class PostBolt implements intf.Bolt {
    private fixed_url;
    private client;
    private onEmit;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
