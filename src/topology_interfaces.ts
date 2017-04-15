export interface SimpleCallback {
    (error?: Error): void;
}
export interface SimpleResultCallback<T> {
    (error?: Error, data?: T): void;
}
export interface InitContextCallback {
    (error?: Error, context?: any): void;
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
    next(callback: SpoutNextCallback);
}

export interface LeadershipResultStatus {
    leadership_status: string
}
export interface LeadershipResultWorkerStatus {
    name: string;
    status: string;
}
export interface LeadershipResultTopologyStatus {
    uuid: string;
    status: string;
}
export interface StorageResultMessage {
    cmd: string;
    content: any;
}
export interface CoordinationStorage {
    getLeadershipStatus(callback: SimpleResultCallback<LeadershipResultStatus>);
    getWorkerStatus(callback: SimpleResultCallback<LeadershipResultWorkerStatus[]>);
    getTopologyStatus(callback: SimpleResultCallback<LeadershipResultTopologyStatus[]>);
    getTopologiesForWorker(worker: string, callback: SimpleResultCallback<LeadershipResultTopologyStatus[]>);
    getMessages(name: string, callback: SimpleResultCallback<StorageResultMessage[]>);

    registerWorker(name: string, callback: SimpleCallback);
    announceLeaderCandidacy(name: string, callback: SimpleCallback);
    checkLeaderCandidacy(name: string, callback: SimpleResultCallback<boolean>);
    assignTopology(uuid: string, worker: string, SimpleCallback);
    setTopologyStatus(uuid: string, status: string, error: string, SimpleCallback)
    setWorkerStatus(worker: string, status: string, SimpleCallback);
}
