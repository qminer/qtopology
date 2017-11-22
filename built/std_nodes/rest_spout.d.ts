import * as intf from "../topology_interfaces";
/** This spout receives requests (messages/data) over REST interface.
 * It assumes data is in JSON format.
 */
export declare class RestSpout implements intf.Spout {
    private stream_id;
    private should_run;
    private port;
    private send_request_metadata;
    private max_queue_len;
    private server;
    private queue;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
