import * as intf from "../topology_interfaces";
/** This bolt attaches fixed fields to incoming messages
 * and sends them forward. */
export declare class AttacherBolt implements intf.Bolt {
    private extra_fields;
    private onEmit;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
