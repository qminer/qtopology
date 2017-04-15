import * as intf from "../topology_interfaces";
import * as rest from 'node-rest-client';
/** This bolt sends GET request to specified url
 * and forwards the result.
 * */
export declare class GetBolt implements intf.Bolt {
    name: string;
    fixed_url: string;
    client: rest.Client;
    onEmit: intf.BoltEmitCallback;
    constructor();
    init(name: any, config: any, callback: any): void;
    heartbeat(): void;
    shutdown(callback: any): void;
    receive(data: any, stream_id: any, callback: any): void;
}
