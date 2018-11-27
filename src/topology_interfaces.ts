/////////////////////////////////////////////////////////////////////////
// Different callbacks

export type SimpleCallback = (error?: Error) => void;
export type SimpleResultCallback<T> = (error?: Error, data?: T) => void;
export type InitContextCallback = (error?: Error, context?: any) => void;
export type BoltEmitCallback = (data: any, stream_id: string, callback: SimpleCallback) => void;
export type SpoutNextCallback = (err: Error, data: any, stream_id: string) => void;

////////////////////////////////////////////////////////////////////////
// Options for validation

export interface IValidationOptions {
    config: any;
    exitOnError?: boolean;
    throwOnError?: boolean;
}

////////////////////////////////////////////////////////////////////////
// Basic topology-definition type

export interface ITopologyDefinition {
    general: ITopologyDefinitionGeneral;
    spouts: ITopologyDefinitionSpout[];
    bolts: ITopologyDefinitionBolt[];
    variables: any;
}

export interface ITopologyDefinitionGeneral {
    heartbeat: number;
    weight?: number;
    worker_affinity?: string[];
    pass_binary_messages?: boolean;
}

export interface ITopologyDefinitionSpout {
    name: string;
    type?: string;
    disabled?: boolean;
    working_dir: string;
    cmd: string;
    subtype?: string;
    telemetry_timeout?: number;
    init: any;
}
export interface ITopologyDefinitionBolt {
    name: string;
    type?: string;
    disabled?: boolean;
    working_dir: string;
    cmd: string;
    subtype?: string;
    telemetry_timeout?: number;
    inputs: ITopologyDefinitionBoltInput[];
    init: any;
    allow_parallel?: boolean;
}
export interface ITopologyDefinitionBoltInput {
    source: string;
    stream_id?: string;
    disabled?: boolean;
}

////////////////////////////////////////////////////////////////////////
// Inetrface that need to be implemented by custom bolts and spouts

export interface IBolt {
    init(name: string, config: any, context: any, callback: SimpleCallback);
    heartbeat();
    shutdown(callback: SimpleCallback);
    receive(data: any, stream_id: string, callback: SimpleCallback);
}

export interface ISpout {
    init(name: string, config: any, context: any, callback: SimpleCallback);
    heartbeat();
    shutdown(callback: SimpleCallback);
    run();
    pause();
    next(callback: SpoutNextCallback);
}

////////////////////////////////////////////////////////////////////////
// Messages that are sent from parent process to child process

export interface IParentMsg {
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

export interface IChildMsg {
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
    exit_ok = 0,
    parent_disconnect = 1,
    parent_ping_timeout = 2,
    init_error = 10,
    pause_error = 20,
    run_error = 25,
    shutdown_notinit_error = 30,
    shutdown_internal_error = 40,
    shutdown_unlikely_error = 41,
    internal_error = 110,
    unhandeled_error = 999
}

////////////////////////////////////////////////////////////////////////
// Coordination-storage interface and its satelites

/**
 * Constants for using distributed functionality.
 */
export const CONSTS = {
    LeaderMessages: {
        kill_topology: "kill_topology",
        rebalance: "rebalance",
        set_disabled: "set_disabled",
        set_enabled: "set_enabled",
        shutdown: "shutdown",
        start_topologies: "start_topologies",
        start_topology: "start_topology",
        stop_topologies: "stop_topologies",
        stop_topology: "stop_topology"
    },
    LeadershipStatus: {
        ok: "ok",
        pending: "pending",
        vacant: "vacant"
    },
    TopologyStatus: {
        error: "error",
        running: "running",
        unassigned: "unassigned",
        waiting: "waiting"
    },
    WorkerLStatus: {
        candidate: "candidate",
        leader: "leader",
        normal: "normal"
    },
    WorkerStatus: {
        alive: "alive",
        closing: "closing",
        dead: "dead",
        disabled: "disabled",
        unloaded: "unloaded"
    }
};

export interface ILeadershipResultStatus {
    leadership: string;
}
export interface IWorkerStatus {
    name: string;
    status: string;
    lstatus: string;
    last_ping: number;
    last_ping_d: Date;
    pid: number;
}
export interface IWorkerStatusHistory {
    name: string;
    status: string;
    lstatus: string;
    ts: Date;
    pid: number;
}
export interface ITopologyStatus {
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
export interface ITopologyStatusHistory extends ITopologyStatus {
    ts: Date;
}
export interface IStorageResultMessage {
    cmd: string;
    content: any;
    created: Date;
}
export interface IStorageProperty {
    key: string;
    value: string | number | boolean;
}
export interface ITopologyInfoResponse extends ITopologyStatus {
    config: ITopologyDefinition;
}
export interface IMsgQueueItem {
    name: string;
    cmd: string;
    data: any;
    created: Date;
    valid_until: Date;
}

/**
 * Interface that needs to be implemented by all storage implementations.
 */
export interface ICoordinationStorage {

    getWorkerStatus(callback: SimpleResultCallback<IWorkerStatus[]>);
    getTopologyStatus(callback: SimpleResultCallback<ITopologyStatus[]>);
    getTopologiesForWorker(worker: string, callback: SimpleResultCallback<ITopologyStatus[]>);
    getMessages(name: string, callback: SimpleResultCallback<IStorageResultMessage[]>);
    getMessage(name: string, callback: SimpleResultCallback<IStorageResultMessage>);
    getTopologyInfo(uuid: string, callback: SimpleResultCallback<ITopologyInfoResponse>);

    getTopologyHistory(uuid: string, callback: SimpleResultCallback<ITopologyStatusHistory[]>);
    getWorkerHistory(name: string, callback: SimpleResultCallback<IWorkerStatusHistory[]>);

    registerWorker(name: string, callback: SimpleCallback);
    pingWorker(name: string, callback?: SimpleCallback);
    announceLeaderCandidacy(name: string, callback: SimpleCallback);
    checkLeaderCandidacy(name: string, callback: SimpleResultCallback<boolean>);

    assignTopology(uuid: string, worker: string, callback: SimpleCallback);
    setTopologyStatus(uuid: string, worker: string, status: string, error: string, callback: SimpleCallback);
    setTopologyPid(uuid: string, pid: number, callback: SimpleCallback);
    setWorkerStatus(worker: string, status: string, callback: SimpleCallback);
    setWorkerLStatus(worker: string, lstatus: string, callback: SimpleCallback);

    sendMessageToWorker(worker: string, cmd: string, content: any, valid_msec: number, callback: SimpleCallback);
    getMsgQueueContent(callback: SimpleResultCallback<IMsgQueueItem[]>);

    registerTopology(uuid: string, config: ITopologyDefinition, callback: SimpleCallback);
    disableTopology(uuid: string, callback: SimpleCallback);
    enableTopology(uuid: string, callback: SimpleCallback);
    stopTopology(uuid: string, callback: SimpleCallback);
    killTopology(uuid: string, callback: SimpleCallback);
    deleteTopology(uuid: string, callback: SimpleCallback);

    deleteWorker(name: string, callback: SimpleCallback);

    getProperties(callback: SimpleResultCallback<IStorageProperty[]>);
}
