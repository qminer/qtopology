import * as intf from "./topology_interfaces";
/** Class that performs redirection of messages after they are emited from nodes */
export declare class OutputRouter {
    private sources;
    /** Constructor prepares the object before any information is received. */
    constructor();
    /** This method registers binding between source and destination
     * @param {string} source - Name of source
     * @param {string} destination - Name of destination
     * @param {string} stream_id - Stream ID used for routing
     */
    register(source: string, destination: string, stream_id: string): void;
    /** Returns list of names that are destinations for data, emitted by source.
     * @param {*} source - Name of source
     * @param {string} stream_id - Stream ID used for routing
     */
    getDestinationsForSource(source: string, stream_id: string): string[];
}
/** This class runs local topology */
export declare class TopologyLocal {
    private spouts;
    private bolts;
    private config;
    private uuid;
    private logging_prefix;
    private pass_binary_messages;
    private heartbeatTimeout;
    private router;
    private isInitialized;
    private isRunning;
    private isShuttingDown;
    private heartbeatTimer;
    private onErrorHandler;
    /** Constructor prepares the object before any information is received. */
    constructor(onError?: intf.SimpleCallback);
    /** Handler for all internal errors */
    private onInternalError(e);
    /** Initialization that sets up internal structure and
     * starts underlaying processes.
     */
    init(uuid: string, config: any, callback: intf.SimpleCallback): void;
    /** Sends run signal to all spouts. Each spout.run is idempotent */
    run(): void;
    /** Sends pause signal to all spouts. Each spout.pause is idempotent  */
    pause(callback: intf.SimpleCallback): void;
    /** Sends shutdown signal to all child processes */
    shutdown(callback: intf.SimpleCallback): void;
    /** Returns uuid of the topology that is running. */
    getUuid(): string;
    /** Runs heartbeat pump until this object shuts down */
    private runHeartbeat();
    /** Sends heartbeat signal to all child processes */
    private heartbeat();
    /** This method redirects/broadcasts message from source to other nodes.
     * It is done in async/parallel manner.
     * @param {string} source - Name of the source that emitted this data
     * @param {Object} data - Data content of the message
     * @param {string} stream_id - Name of the stream that this data belongs to
     * @param {Function} callback - standard callback
     */
    private redirect(source, data, stream_id, callback);
    /** Find bolt with given name.
     * @param {string} name - Name of the bolt that we need to find
     */
    private getBolt(name);
    /** This method optionally runs context initialization code
     * and returns the context object.
     * @param {Function} callback - standard callback
     */
    private initContext(callback);
}
