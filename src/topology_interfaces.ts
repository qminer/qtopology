/////////////////////////////////////////////////////////////////////////
// Different callbacks

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

////////////////////////////////////////////////////////////////////////
// Options for validation

export interface ValidationOptions {
    config: any;
    exitOnError: boolean;
    throwOnError: boolean;
}

////////////////////////////////////////////////////////////////////////
// Inetrface that need to be implemented by custom bolts and spouts

export interface Bolt {
    init(name: string, config: any, context: any, callback: SimpleCallback);
    heartbeat();
    shutdown(callback: SimpleCallback);
    receive(data: any, stream_id: string, callback: SimpleCallback);
}

export interface Spout {
    init(name: string, config: any, context: any, callback: SimpleCallback);
    heartbeat();
    shutdown(callback: SimpleCallback);
    run();
    pause();
    next(callback: SpoutNextCallback);
}

////////////////////////////////////////////////////////////////////////
// Messages that are sent from parent process to child process

export interface ParentMsg {
    cmd: ParentMsgCode;
    data: any;
}

export enum ParentMsgCode {
    init,
    run,
    pause,
    shutdown
}

////////////////////////////////////////////////////////////////////////
// Messages that are sent from child process to parent process

export interface ChildMsg {
    cmd: ChildMsgCode;
    data: any;
}

export enum ChildMsgCode {
    response_init,
    response_run,
    response_pause,
    response_shutdown
}

////////////////////////////////////////////////////////////////////////
// Coordination-storage interface and its satelites

export interface LeadershipResultStatus {
    leadership: string
}
export interface LeadershipResultWorkerStatus {
    name: string;
    status: string; // dead, unloaded
    lstatus: string,
    last_ping_d: number,
    last_ping: Date,
    lstatus_ts: number,
    lstatus_ts_d: Date
}
export interface LeadershipResultTopologyStatus {
    uuid: string;
    status: string;
    worker: string;
    weight: number;
    enabled: boolean;
    worker_affinity: string[];
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
    getTopologyDefinition(uuid: string, callback: SimpleResultCallback<any>);

    registerWorker(name: string, callback: SimpleCallback);
    announceLeaderCandidacy(name: string, callback: SimpleCallback);
    checkLeaderCandidacy(name: string, callback: SimpleResultCallback<boolean>);
    assignTopology(uuid: string, worker: string, callback: SimpleCallback);
    setTopologyStatus(uuid: string, status: string, error: string, callback: SimpleCallback);
    setWorkerStatus(worker: string, status: string, callback: SimpleCallback);

    registerTopology(uuid: string, config: any, callback: SimpleCallback);
    disableTopology(uuid: string, callback: SimpleCallback);
    enableTopology(uuid: string, callback: SimpleCallback);
    deleteTopology(uuid: string, callback: SimpleCallback);
}

// export interface CoordinationStorageBrowser {

//     init(storage: CoordinationStorage, callback: SimpleCallback);

//     getFile(name: string, callback: SimpleResultCallback<string>);

//     getWorkerStatus(callback: SimpleResultCallback<string>);
//     getTopologyStatus(callback: SimpleResultCallback<string>);

//     postRegisterTopology(config: any, overwrite: boolean, callback: SimpleCallback);
//     postDisableTopology(uuid: string, callback: SimpleCallback);
//     postEnableTopology(uuid: string, callback: SimpleCallback);
//     postDeleteTopology(uuid: string, callback: SimpleCallback);
// }
