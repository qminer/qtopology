import * as intf from "../topology_interfaces";
/** This bolt sends GET request to specified url
 * and forwards the result.
 * */
export declare class GetBolt implements intf.Bolt {
    private name;
    private fixed_url;
    private client;
    private onEmit;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
