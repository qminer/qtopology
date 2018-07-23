import * as intf from "../topology_interfaces";
/** This bolt transforms given date fields in incoming
 * messages either Date objects, numerics or booleans
 * and sends them forward. */
export declare class TypeTransformBolt implements intf.Bolt {
    private date_transform_fields;
    private numeric_transform_fields;
    private bool_transform_fields;
    private onEmit;
    private stream_id;
    private reuse_stream_id;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
