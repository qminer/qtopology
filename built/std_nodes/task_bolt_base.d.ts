import * as intf from "../topology_interfaces";
/** This bolt base object server as base class for simple tasks
 * that are repeated every X milliseconds. */
export declare class TaskBoltBase implements intf.Bolt {
    protected onEmit: intf.BoltEmitCallback;
    private is_running;
    private next_run;
    private repeat_after;
    private shutdown_cb;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    protected runInternal(callback: intf.SimpleCallback): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
