import * as intf from "../topology_interfaces";
import * as rest from 'node-rest-client';
/** This spout sends GET request to the specified url in regular
 * time intervals and forwards the result.
 * */
export declare class GetSpout implements intf.Spout {
    name: string;
    stream_id: string;
    url: string;
    repeat: number;
    should_run: boolean;
    next_tuple: any;
    next_ts: number;
    client: rest.Client;
    constructor();
    init(name: string, config: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
