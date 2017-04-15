export interface SimpleCallback {
    (error?: Error): void;
}
export interface BoltEmitCallback {
    (data: any, stream_id: string, callback: SimpleCallback): void;
}
export interface SpoutNextCallback {
    (err: Error, data: any, stream_id: string): void;
}
export interface Bolt {
    init(name: string, config: any, callback: SimpleCallback): any;
    heartbeat(): any;
    shutdown(callback: SimpleCallback): any;
    receive(data: any, stream_id: string, callback: SimpleCallback): any;
}
export interface Spout {
    init(name: string, config: any, callback: SimpleCallback): any;
    heartbeat(): any;
    shutdown(callback: SimpleCallback): any;
    run(): any;
    pause(): any;
    next(callback: SpoutNextCallback): any;
}
