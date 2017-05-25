import * as intf from "../topology_interfaces";
/** This bolt explodes after predefined time interval.
 * Primarily used for testing.
*/
export declare class BombBolt implements intf.Bolt {
    private name;
    private explode_after;
    private started_at;
    private onEmit;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
