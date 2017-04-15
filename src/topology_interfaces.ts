export interface SimpleCallback {
    (error?: Error): void;
}
export interface BoltEmitCallback {
    (data: any, stream_id: string, callback: SimpleCallback): void;
}
export interface SpoutAckCallback {
    (error: Error, callback: SimpleCallback): void;
}
export interface SpoutNextCallback {
    (err: Error, data: any, stream_id: string, callback?: SpoutAckCallback): void;
}

export interface ValidationOptions {
    config: any;
    exitOnError: boolean;
    throwOnError: boolean;
}

export interface Bolt {
    init(name: string, config: any, callback: SimpleCallback);
    heartbeat();
    shutdown(callback: SimpleCallback);
    receive(data: any, stream_id: string, callback: SimpleCallback);
}

export interface Spout {
    init(name: string, config: any, callback: SimpleCallback);
    heartbeat();
    shutdown(callback: SimpleCallback);
    run();
    pause();
    next(callback:SpoutNextCallback);
}

