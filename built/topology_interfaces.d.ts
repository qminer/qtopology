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
export interface TopologyDefinition {
    general: TopologyDefinitionGeneral;
    spouts: TopologyDefinitionSpout[];
    bolts: TopologyDefinitionBolt[];
    variables: any;
}
export interface TopologyDefinitionGeneral {
    heartbeat: number;
    weight?: number;
    worker_affinity?: string[];
    pass_binary_messages?: boolean;
}
export interface TopologyDefinitionSpout {
    name: string;
    type?: string;
    disabled?: boolean;
    working_dir: string;
    cmd: string;
    subtype?: string;
    telemetry_timeout?: number;
    init: any;
}
export interface TopologyDefinitionBolt {
    name: string;
    type?: string;
    disabled?: boolean;
    working_dir: string;
    cmd: string;
    subtype?: string;
    telemetry_timeout?: number;
    inputs: TopologyDefinitionBoltInput[];
    init: any;
    allow_parallel?: boolean;
}
export interface TopologyDefinitionBoltInput {
    source: string;
    stream_id?: string;
    disabled?: boolean;
}
export interface Bolt {
    init(name: string, config: any, context: any, callback: SimpleCallback): any;
    heartbeat(): any;
    shutdown(callback: SimpleCallback): any;
    receive(data: any, stream_id: string, callback: SimpleCallback): any;
}
export interface Spout {
    init(name: string, config: any, context: any, callback: SimpleCallback): any;
    heartbeat(): any;
    shutdown(callback: SimpleCallback): any;
    run(): any;
    pause(): any;
    next(callback: SpoutNextCallback): any;
}
export interface ParentMsg {
    cmd: ParentMsgCode;
    data: any;
}
export declare enum ParentMsgCode {
    init = 0,
    run = 1,
    pause = 2,
    shutdown = 3,
}
export interface ChildMsg {
    cmd: ChildMsgCode;
    data: any;
}
export declare enum ChildMsgCode {
    response_init = 0,
    response_run = 1,
    response_pause = 2,
    response_shutdown = 3,
}
/**
 * Constants for using distributed functionality.
 */
export declare var Consts: {
    LeadershipStatus: {
        vacant: string;
        pending: string;
        ok: string;
    };
    WorkerStatus: {
        alive: string;
        closing: string;
        dead: string;
        unloaded: string;
    };
    WorkerLStatus: {
        leader: string;
        candidate: string;
        normal: string;
    };
    TopologyStatus: {
        running: string;
        paused: string;
        waiting: string;
        error: string;
        unassigned: string;
    };
    LeaderMessages: {
        rebalance: string;
        start_topology: string;
        stop_topology: string;
        shutdown: string;
    };
};
export interface LeadershipResultStatus {
    leadership: string;
}
export interface WorkerStatus {
    name: string;
    status: string;
    lstatus: string;
    last_ping: number;
    last_ping_d: Date;
}
export interface WorkerStatusHistory {
    name: string;
    status: string;
    lstatus: string;
    ts: Date;
}
export interface TopologyStatus {
    uuid: string;
    status: string;
    worker: string;
    error: string;
    weight: number;
    enabled: boolean;
    last_ping: number;
    last_ping_d: Date;
    worker_affinity: string[];
}
export interface TopologyStatusHistory extends TopologyStatus {
    ts: Date;
}
export interface StorageResultMessage {
    cmd: string;
    content: any;
    created: Date;
}
export interface StorageProperty {
    key: string;
    value: string | number | boolean;
}
export interface TopologyInfoResponse extends TopologyStatus {
    config: TopologyDefinition;
}
/**
 * Interface that needs to be implemented by all storage implementations.
 */
export interface CoordinationStorage {
    getLeadershipStatus(callback: SimpleResultCallback<LeadershipResultStatus>): any;
    getWorkerStatus(callback: SimpleResultCallback<WorkerStatus[]>): any;
    getTopologyStatus(callback: SimpleResultCallback<TopologyStatus[]>): any;
    getTopologiesForWorker(worker: string, callback: SimpleResultCallback<TopologyStatus[]>): any;
    getMessages(name: string, callback: SimpleResultCallback<StorageResultMessage[]>): any;
    getTopologyInfo(uuid: string, callback: SimpleResultCallback<TopologyInfoResponse>): any;
    getTopologyHistory(uuid: string, callback: SimpleResultCallback<TopologyStatusHistory[]>): any;
    getWorkerHistory(name: string, callback: SimpleResultCallback<WorkerStatusHistory[]>): any;
    registerWorker(name: string, callback: SimpleCallback): any;
    announceLeaderCandidacy(name: string, callback: SimpleCallback): any;
    checkLeaderCandidacy(name: string, callback: SimpleResultCallback<boolean>): any;
    assignTopology(uuid: string, worker: string, callback: SimpleCallback): any;
    setTopologyStatus(uuid: string, status: string, error: string, callback: SimpleCallback): any;
    setWorkerStatus(worker: string, status: string, callback: SimpleCallback): any;
    sendMessageToWorker(worker: string, cmd: string, content: any, callback: SimpleCallback): any;
    registerTopology(uuid: string, config: TopologyDefinition, callback: SimpleCallback): any;
    disableTopology(uuid: string, callback: SimpleCallback): any;
    enableTopology(uuid: string, callback: SimpleCallback): any;
    stopTopology(uuid: string, callback: SimpleCallback): any;
    deleteTopology(uuid: string, callback: SimpleCallback): any;
    clearTopologyError(uuid: string, callback: SimpleCallback): any;
    deleteWorker(name: string, callback: SimpleCallback): any;
    shutDownWorker(name: string, callback: SimpleCallback): any;
    getProperties(callback: SimpleResultCallback<StorageProperty[]>): any;
}
