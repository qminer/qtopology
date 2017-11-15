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
export interface SpoutNextCallback {
    (err: Error, data: any, stream_id: string): void;
}

////////////////////////////////////////////////////////////////////////
// Options for validation

export interface ValidationOptions {
    config: any;
    exitOnError: boolean;
    throwOnError: boolean;
}

////////////////////////////////////////////////////////////////////////
// Basic topology-definition type

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
    ping,
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
    response_ping,
    response_shutdown,
    error
}

export enum ChildExitCode {
    exit_ok=0,
    parent_disconnect=1,
    parent_ping_timeout=2,
    init_error=10,
    pause_error=20,
    run_error=25,
    shutdown_notinit_error=30,
    shutdown_internal_error=40,
    shutdown_unlikely_error=41,
    internal_error=110,
    unhandeled_error=999
}

////////////////////////////////////////////////////////////////////////
// Coordination-storage interface and its satelites

/**
 * Constants for using distributed functionality.
 */
export var Consts = {
    LeadershipStatus: {
        vacant: "vacant",
        pending: "pending",
        ok: "ok"
    },
    WorkerStatus: {
        alive: "alive",
        closing: "closing",
        dead: "dead",
        unloaded: "unloaded"
    },
    WorkerLStatus: {
        leader: "leader",
        candidate: "candidate",
        normal: "normal"
    },
    TopologyStatus: {
        running: "running",
        paused: "paused",
        waiting: "waiting",
        error: "error",
        unassigned: "unassigned"
    },
    LeaderMessages: {
        rebalance: "rebalance",
        start_topology: "start_topology",
        stop_topology: "stop_topology",
        kill_topology: "kill_topology",
        shutdown: "shutdown"
    }
}

export interface LeadershipResultStatus {
    leadership: string
}
export interface WorkerStatus {
    name: string;
    status: string;
    lstatus: string;
    last_ping: number;
    last_ping_d: Date;
    pid: number;
}
export interface WorkerStatusHistory {
    name: string;
    status: string;
    lstatus: string;
    ts: Date;
    pid: number;
}
export interface TopologyStatus {
    uuid: string;
    status: string;
    worker: string;
    error: string;
    pid: number;
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
export interface MsgQueueItem {
    name: string;
    cmd: string;
    data: any;
    created: Date;
    valid_until: Date;
}

/**
 * Interface that needs to be implemented by all storage implementations.
 */
export interface CoordinationStorage {

    getWorkerStatus(callback: SimpleResultCallback<WorkerStatus[]>);
    getTopologyStatus(callback: SimpleResultCallback<TopologyStatus[]>);
    getTopologiesForWorker(worker: string, callback: SimpleResultCallback<TopologyStatus[]>);
    getMessages(name: string, callback: SimpleResultCallback<StorageResultMessage[]>);
    getMessage(name: string, callback: SimpleResultCallback<StorageResultMessage>);
    getTopologyInfo(uuid: string, callback: SimpleResultCallback<TopologyInfoResponse>);

    getTopologyHistory(uuid: string, callback: SimpleResultCallback<TopologyStatusHistory[]>);
    getWorkerHistory(name: string, callback: SimpleResultCallback<WorkerStatusHistory[]>);

    registerWorker(name: string, callback: SimpleCallback);
    announceLeaderCandidacy(name: string, callback: SimpleCallback);
    checkLeaderCandidacy(name: string, callback: SimpleResultCallback<boolean>);

    assignTopology(uuid: string, worker: string, callback: SimpleCallback);
    setTopologyStatus(uuid: string, status: string, error: string, callback: SimpleCallback);
    setTopologyPid(uuid: string, pid: number, callback: SimpleCallback);
    setWorkerStatus(worker: string, status: string, callback: SimpleCallback);
    setWorkerLStatus(worker: string, lstatus: string, callback: SimpleCallback);

    sendMessageToWorker(worker: string, cmd: string, content: any, valid_msec: number, callback: SimpleCallback);
    getMsgQueueContent(callback: SimpleResultCallback<MsgQueueItem[]>);

    registerTopology(uuid: string, config: TopologyDefinition, callback: SimpleCallback);
    disableTopology(uuid: string, callback: SimpleCallback);
    enableTopology(uuid: string, callback: SimpleCallback);
    stopTopology(uuid: string, callback: SimpleCallback);
    killTopology(uuid: string, callback: SimpleCallback);
    deleteTopology(uuid: string, callback: SimpleCallback);
    clearTopologyError(uuid: string, callback: SimpleCallback);

    deleteWorker(name: string, callback: SimpleCallback);
    shutDownWorker(name: string, callback: SimpleCallback);

    getProperties(callback: SimpleResultCallback<StorageProperty[]>);
}
