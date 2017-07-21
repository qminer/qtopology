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
export interface LeadershipResultStatus {
    leadership: string;
}
export interface LeadershipResultWorkerStatus {
    name: string;
    status: string;
    lstatus: string;
    last_ping: number;
    last_ping_d: Date;
    lstatus_ts: number;
    lstatus_ts_d: Date;
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
export interface StorageProperty {
    key: string;
    value: string | number | boolean;
}
export interface TopologyDefinitionResponse {
    config: TopologyDefinition;
    current_worker: string;
}
/**
 * Interface that needs to be implemented by all storage implementations.
 */
export interface CoordinationStorage {
    getLeadershipStatus(callback: SimpleResultCallback<LeadershipResultStatus>): any;
    getWorkerStatus(callback: SimpleResultCallback<LeadershipResultWorkerStatus[]>): any;
    getTopologyStatus(callback: SimpleResultCallback<LeadershipResultTopologyStatus[]>): any;
    getTopologiesForWorker(worker: string, callback: SimpleResultCallback<LeadershipResultTopologyStatus[]>): any;
    getMessages(name: string, callback: SimpleResultCallback<StorageResultMessage[]>): any;
    getTopologyDefinition(uuid: string, callback: SimpleResultCallback<TopologyDefinitionResponse>): any;
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
    deleteTopology(uuid: string, callback: SimpleCallback): any;
    getProperties(callback: SimpleResultCallback<StorageProperty[]>): any;
}
