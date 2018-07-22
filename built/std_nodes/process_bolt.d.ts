import * as intf from "../topology_interfaces";
/** This bolt spawns specified process and communicates with it using stdin and stdout.
 * Tuples are serialized into JSON. */
export declare class ProcessBoltContinuous implements intf.Bolt {
    private stream_id;
    private cmd_line;
    private tuples;
    private onEmit;
    private child_process;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    private handleNewData(content);
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
