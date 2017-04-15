import * as intf from "./topology_interfaces";
import * as async from "async";
import * as path from "path";
import * as top_inproc from "./topology_local_inprocess";

////////////////////////////////////////////////////////////////////

class OutputRouterDestination {
    destination: string;
    stream_id: string;
}

/** Class that performs redirection of messages after they are emited from nodes */
export class OutputRouter {

    sources: Map<string, OutputRouterDestination>;

    /** Constructor prepares the object before any information is received. */
    constructor() {
        this.sources = new Map<string, OutputRouterDestination>();
    }

    /** This method registers binding between source and destination
     * @param {string} source - Name of source
     * @param {string} destination - Name of destination
     * @param {string} stream_id - Stream ID used for routing
     */
    register(source: string, destination: string, stream_id: string) {
        if (!this.sources[source]) {
            this.sources[source] = [];
        }
        this.sources[source].push({ destination: destination, stream_id: stream_id || null });
    }

    /** Returns list of names that are destinations for data, emitted by source.
     * @param {*} source - Name of source
     * @param {string} stream_id - Stream ID used for routing
     */
    getDestinationsForSource(source: string, stream_id: string): string[] {
        if (!this.sources[source]) {
            return [];
        }
        return this.sources[source]
            .filter(x => { return x.stream_id == stream_id; })
            .map(x => x.destination);
    }
}

/** This class runs local topology */
export class TopologyLocal {

    _spouts: top_inproc.TopologySpoutInproc[];
    _bolts: top_inproc.TopologyBoltInproc[];
    _config: any;
    _heartbeatTimeout: number;
    _router: OutputRouter;
    _isRunning: boolean;
    _isShuttingDown: boolean;
    _heartbeatTimer: NodeJS.Timer;
    _heartbeatCallback: intf.SimpleCallback;

    /** Constructor prepares the object before any information is received. */
    constructor() {
        this._spouts = [];
        this._bolts = [];
        this._config = null;
        this._heartbeatTimeout = 10000;
        this._router = new OutputRouter();

        this._isRunning = false;
        this._isShuttingDown = false;
        this._heartbeatTimer = null;
        this._heartbeatCallback = null;
    }

    /** Initialization that sets up internal structure and
     * starts underlaying processes.
     */
    init(config: any, callback: intf.SimpleCallback) {
        let self = this;
        self._config = config;
        self._heartbeatTimeout = config.general.heartbeat;
        self._initContext((err, context) => {
            let tasks = [];
            self._config.bolts.forEach((bolt_config) => {
                if (bolt_config.disabled) {
                    return;
                }
                bolt_config.onEmit = (data, stream_id, callback) => {
                    self._redirect(bolt_config.name, data, stream_id, callback);
                };
                let bolt = null;
                bolt = new top_inproc.TopologyBoltInproc(bolt_config, context);
                self._bolts.push(bolt);
                tasks.push((xcallback) => { bolt.init(xcallback); });
                for (let input of bolt_config.inputs) {
                    self._router.register(input.source, bolt_config.name, input.stream_id);
                }
            });
            self._config.spouts.forEach((spout_config) => {
                if (spout_config.disabled) {
                    return;
                }
                spout_config.onEmit = (data, stream_id, callback) => {
                    self._redirect(spout_config.name, data, stream_id, callback);
                };
                let spout = null;

                spout = new top_inproc.TopologySpoutInproc(spout_config, context);
                self._spouts.push(spout);
                tasks.push((xcallback) => { spout.init(xcallback); });
            });
            self._runHeartbeat();
            async.series(tasks, callback);
        });
    }

    /** Sends run signal to all spouts */
    run() {
        console.log("Local topology started");
        for (let spout of this._spouts) {
            spout.run();
        }
        this._isRunning = true;
    }

    /** Sends pause signal to all spouts */
    pause(callback: intf.SimpleCallback) {
        for (let spout of this._spouts) {
            spout.pause();
        }
        this._isRunning = false;
        callback();
    }

    /** Sends shutdown signal to all child processes */
    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        self._isShuttingDown = true;
        if (self._heartbeatTimer) {
            clearInterval(self._heartbeatTimer);
            self._heartbeatCallback();
        }
        self.pause((err) => {
            let tasks = [];
            self._spouts.forEach((spout) => {
                tasks.push((xcallback) => {
                    spout.shutdown(xcallback);
                });
            });
            self._bolts.forEach((bolt) => {
                tasks.push((xcallback) => {
                    bolt.shutdown(xcallback);
                });
            });
            if (self._config.general.shutdown) {
                let factory = (module_path) => {
                    return (xcallback) => {
                        require(module_path).shutdown(xcallback);
                    };
                };
                for (let shutdown_conf of self._config.general.shutdown) {
                    let dir = path.resolve(shutdown_conf.working_dir); // path may be relative to current working dir
                    let module_path = path.join(dir, shutdown_conf.cmd);
                    tasks.push(factory(module_path));
                }
            }
            async.series(tasks, callback);
        });
    }

    /** Runs heartbeat pump until this object shuts down */
    _runHeartbeat() {
        let self = this;
        async.whilst(
            () => {
                return !self._isShuttingDown;
            },
            (xcallback) => {
                self._heartbeatCallback = xcallback;
                self._heartbeatTimer = setTimeout(
                    () => {
                        if (self._isRunning) {
                            self._heartbeat();
                        }
                        xcallback();
                    },
                    self._heartbeatTimeout);
            },
            () => { }
        );
    }

    /** Sends heartbeat signal to all child processes */
    _heartbeat() {
        for (let spout of this._spouts) {
            spout.heartbeat();
        }
        for (let bolt of this._bolts) {
            bolt.heartbeat();
        }
    }

    /** This method redirects/broadcasts message from source to other nodes.
     * It is done in async/parallel manner.
     * @param {string} source - Name of the source that emitted this data
     * @param {Object} data - Data content of the message
     * @param {string} stream_id - Name of the stream that this data belongs to
     * @param {Function} callback - standard callback
     */
    _redirect(source: string, data: any, stream_id: string, callback: intf.SimpleCallback) {
        let self = this;
        let destinations = self._router.getDestinationsForSource(source, stream_id);
        async.each(
            destinations,
            (destination, xcallback) => {
                let data_clone = {};
                Object.assign(data_clone, data);
                let bolt = self._getBolt(destination);
                bolt.receive(data_clone, stream_id, xcallback);
            },
            callback
        );
    }

    /** Find bolt with given name.
     * @param {string} name - Name of the bolt that we need to find
     */
    _getBolt(name: string) {
        let hits = this._bolts.filter(x => x.getName() == name);
        if (hits.length === 0) {
            return null;
        }
        return hits[0];
    }

    /** This method optionally runs context initialization code
     * and returns the context object.
     * @param {Function} callback - standard callback
     */
    _initContext(callback: intf.InitContextCallback) {
        let self = this;
        if (self._config.general.initialization) {
            let common_context = {};
            async.eachSeries(
                self._config.general.initialization,
                (init_conf, xcallback) => {
                    let dir = path.resolve(init_conf.working_dir); // path may be relative to current working dir
                    let module_path = path.join(dir, init_conf.cmd);
                    require(module_path).init(init_conf.init, common_context, xcallback);
                },
                (err) => {
                    callback(null, common_context);
                }
            );
        } else {
            callback(null, null);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyLocal = TopologyLocal;
