/// <reference types="node" />
import * as intf from "../topology_interfaces";
import * as http from 'http';
/** This spout receives requests (messages/data) over REST interface.
 * It assumes data is in JSON format.
 */
export declare class RestSpout implements intf.Spout {
    name: string;
    stream_id: string;
    should_run: boolean;
    port: number;
    server: http.Server;
    queue: any[];
    constructor();
    init(name: string, config: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
