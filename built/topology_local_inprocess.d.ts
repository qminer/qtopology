import * as intf from "./topology_interfaces";
/** Base class for spouts and bolts - contains telemetry support */
export declare class TopologyNodeBaseInproc {
    protected name: string;
    private telemetry_next_emit;
    private telemetry_timeout;
    private telemetry;
    private telemetry_total;
    constructor(name: string, telemetry_timeout: number);
    /** This method checks if telemetry data should be emitted
     * and calls provided callback if that is the case.
     */
    telemetryHeartbeat(emitCallback: (msg: any, stream_id: string) => void): void;
    /** Adds duration to internal telemetry */
    telemetryAdd(duration: number): void;
}
/** Wrapper for spout */
export declare class TopologySpoutInproc extends TopologyNodeBaseInproc {
    private context;
    private working_dir;
    private cmd;
    private subtype;
    private init_params;
    private isPaused;
    private isError;
    private nextTs;
    private child;
    private emitCallback;
    private errorCallback;
    /** Constructor needs to receive all data */
    constructor(config: any, context: any);
    /** Returns name of this node */
    getName(): string;
    /** Returns inner spout object */
    getSpoutObject(): intf.Spout;
    /** Handler for heartbeat signal */
    heartbeat(): void;
    /** Shuts down the process */
    shutdown(callback: intf.SimpleCallback): void;
    /** Initializes child object. */
    init(callback: intf.SimpleCallback): void;
    /** Sends run signal and starts the "pump" */
    run(): void;
    /** Requests next data message */
    private next(callback);
    /** Sends pause signal to child */
    pause(): void;
    /** Factory method for sys spouts */
    private createSysSpout(spout_config);
}
/** Wrapper for bolt */
export declare class TopologyBoltInproc extends TopologyNodeBaseInproc {
    private context;
    private working_dir;
    private cmd;
    private subtype;
    private init_params;
    private isShuttingDown;
    private isError;
    private nextTs;
    private allow_parallel;
    private inSend;
    private pendingSendRequests;
    private pendingShutdownCallback;
    private child;
    private emitCallback;
    private errorCallback;
    /** Constructor needs to receive all data */
    constructor(config: any, context: any);
    /** Returns name of this node */
    getName(): string;
    /** Returns inner bolt object */
    getBoltObject(): intf.Bolt;
    /** Handler for heartbeat signal */
    heartbeat(): void;
    /** Shuts down the child */
    shutdown(callback: intf.SimpleCallback): any;
    /** Initializes child object. */
    init(callback: intf.SimpleCallback): void;
    /** Sends data to child object. */
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
    /** Factory method for sys bolts */
    private createSysBolt(bolt_config);
}
