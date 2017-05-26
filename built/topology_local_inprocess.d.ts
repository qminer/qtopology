import * as intf from "./topology_interfaces";
/** Wrapper for "spout" in-process */
export declare class TopologySpoutInproc {
    private name;
    private context;
    private working_dir;
    private cmd;
    private subtype;
    private init_params;
    private isStarted;
    private isClosed;
    private isExit;
    private isError;
    private onExit;
    private isPaused;
    private nextTs;
    private telemetry;
    private telemetry_total;
    private child;
    private emitCallback;
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
    /** Sends run signal and starts the "pump"" */
    run(): void;
    /** Requests next data message */
    private next(callback);
    /** Sends pause signal to child */
    pause(): void;
    /** Factory method for sys spouts */
    private createSysSpout(spout_config);
    /** Adds duration to internal telemetry */
    private telemetryAdd(duration);
}
/** Wrapper for "bolt" in-process */
export declare class TopologyBoltInproc {
    private name;
    private context;
    private working_dir;
    private cmd;
    private subtype;
    private init_params;
    private isStarted;
    private isClosed;
    private isExit;
    private isError;
    private onExit;
    private isPaused;
    private isShuttingDown;
    private nextTs;
    private allow_parallel;
    private inSend;
    private pendingSendRequests;
    private pendingShutdownCallback;
    private telemetry;
    private telemetry_total;
    private child;
    private emitCallback;
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
    /** Adds duration to internal telemetry */
    private telemetryAdd(duration);
}
