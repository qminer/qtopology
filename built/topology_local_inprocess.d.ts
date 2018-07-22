import * as intf from "./topology_interfaces";
import * as fb from "./std_nodes/filter_bolt";
import * as pb from "./std_nodes/post_bolt";
import * as cb from "./std_nodes/console_bolt";
import * as ab from "./std_nodes/attacher_bolt";
import * as ac from "./std_nodes/accumulator_bolt";
import * as tb from "./std_nodes/transform_bolt";
import * as gb from "./std_nodes/get_bolt";
import * as rb from "./std_nodes/router_bolt";
import * as bb from "./std_nodes/bomb_bolt";
import * as fab from "./std_nodes/file_append_bolt";
import * as fab2 from "./std_nodes/file_append_bolt_ex";
import * as cntb from "./std_nodes/counter_bolt";
import * as ttb from "./std_nodes/type_transform_bolt";
import * as prb from "./std_nodes/process_bolt";
import * as frs from "./std_nodes/file_reader_spout";
import * as ps from "./std_nodes/process_spout";
import * as rs from "./std_nodes/rest_spout";
import * as ts from "./std_nodes/timer_spout";
import * as gs from "./std_nodes/get_spout";
import * as rss from "./std_nodes/rss_spout";
import * as tss from "./std_nodes/test_spout";
import * as ds from "./std_nodes/dir_watcher_spout";
/** Base class for spouts and bolts - contains telemetry support */
export declare class TopologyNodeBase {
    protected name: string;
    private telemetry_next_emit;
    private telemetry_timeout;
    private telemetry;
    private telemetry_total;
    protected isError: boolean;
    protected firstErrorMessage: string;
    protected errorCallback: intf.SimpleCallback;
    constructor(name: string, telemetry_timeout: number);
    /** This method checks if telemetry data should be emitted
     * and calls provided callback if that is the case.
     */
    telemetryHeartbeat(emitCallback: (msg: any, stream_id: string) => void): void;
    /** Adds duration to internal telemetry */
    telemetryAdd(duration: number): void;
    /** helper function that sets isError flag when a callback is called with an error */
    protected wrapCallbackSetError(callback: intf.SimpleCallback): intf.SimpleCallback;
}
/** Wrapper for spout */
export declare class TopologySpoutWrapper extends TopologyNodeBase {
    private context;
    private working_dir;
    private cmd;
    private subtype;
    private init_params;
    private isPaused;
    private isShuttingDown;
    private initCalled;
    private nextTs;
    private spout;
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
    /** Sends run signal and starts the "pump" */
    run(): void;
    /** Requests next data message */
    private next(callback);
    /** Sends pause signal to child */
    pause(): void;
    /** Factory method for sys spouts */
    static createSysSpout(spout_config: any): frs.FileReaderSpout | ps.ProcessSpout | ps.ProcessSpoutContinuous | rs.RestSpout | ts.TimerSpout | gs.GetSpout | rss.RssSpout | tss.TestSpout | ds.DirWatcherSpout;
}
/** Wrapper for bolt */
export declare class TopologyBoltWrapper extends TopologyNodeBase {
    private context;
    private working_dir;
    private cmd;
    private subtype;
    private init_params;
    private isShuttingDown;
    private initCalled;
    private allow_parallel;
    private inSend;
    private pendingSendRequests;
    private pendingShutdownCallback;
    private bolt;
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
    static createSysBolt(bolt_config: any): fb.FilterBolt | pb.PostBolt | cb.ConsoleBolt | ab.AttacherBolt | ac.AccumulatorBolt | tb.TransformBolt | gb.GetBolt | rb.RouterBolt | bb.BombBolt | fab.FileAppendBolt | fab2.FileAppendBoltEx | cntb.CounterBolt | ttb.TypeTransformBolt | prb.ProcessBoltContinuous;
}
export declare function createSysSpout(config: any): frs.FileReaderSpout | ps.ProcessSpout | ps.ProcessSpoutContinuous | rs.RestSpout | ts.TimerSpout | gs.GetSpout | rss.RssSpout | tss.TestSpout | ds.DirWatcherSpout;
export declare function createSysBolt(config: any): fb.FilterBolt | pb.PostBolt | cb.ConsoleBolt | ab.AttacherBolt | ac.AccumulatorBolt | tb.TransformBolt | gb.GetBolt | rb.RouterBolt | bb.BombBolt | fab.FileAppendBolt | fab2.FileAppendBoltEx | cntb.CounterBolt | ttb.TypeTransformBolt | prb.ProcessBoltContinuous;
