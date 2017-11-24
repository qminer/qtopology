import * as intf from "../topology_interfaces";
/** This spout monitors directory for changes. */
export declare class DirWatcherSpout implements intf.Spout {
    private dir_name;
    private queue;
    private should_run;
    private stream_id;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    run(): void;
    pause(): void;
    next(callback: intf.SpoutNextCallback): void;
}
