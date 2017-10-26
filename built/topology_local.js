"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const path = require("path");
const top_inproc = require("./topology_local_inprocess");
const log = require("./util/logger");
////////////////////////////////////////////////////////////////////
/** Internal record for router mapping */
class OutputRouterDestination {
}
/** Class that performs redirection of messages after they are emited from nodes */
class OutputRouter {
    /** Constructor prepares the object before any information is received. */
    constructor() {
        this.sources = new Map();
    }
    /** This method registers binding between source and destination
     * @param {string} source - Name of source
     * @param {string} destination - Name of destination
     * @param {string} stream_id - Stream ID used for routing
     */
    register(source, destination, stream_id) {
        if (!this.sources[source]) {
            this.sources[source] = [];
        }
        this.sources[source].push({ destination: destination, stream_id: stream_id || null });
    }
    /** Returns list of names that are destinations for data, emitted by source.
     * @param {*} source - Name of source
     * @param {string} stream_id - Stream ID used for routing
     */
    getDestinationsForSource(source, stream_id) {
        if (!this.sources[source]) {
            return [];
        }
        return this.sources[source]
            .filter(x => { return x.stream_id == stream_id; })
            .map(x => x.destination);
    }
}
exports.OutputRouter = OutputRouter;
/** This class runs local topology */
class TopologyLocal {
    /** Constructor prepares the object before any information is received. */
    constructor(onError) {
        this.spouts = [];
        this.bolts = [];
        this.config = null;
        this.uuid = null;
        this.pass_binary_messages = false;
        this.heartbeatTimeout = 10000;
        this.router = new OutputRouter();
        this.isRunning = false;
        this.isShuttingDown = false;
        this.isInitialized = false;
        this.heartbeatTimer = null;
        this.logging_prefix = null;
        this.onErrorHandler = onError || (() => { });
    }
    /** Handler for all internal errors */
    onInternalError(e) {
        this.onErrorHandler(e);
    }
    /** Initialization that sets up internal structure and
     * starts underlaying processes.
     */
    init(uuid, config, callback) {
        try {
            let self = this;
            self.config = config;
            self.uuid = uuid;
            self.logging_prefix = `[TopologyLocal ${uuid}] `;
            self.heartbeatTimeout = config.general.heartbeat;
            self.pass_binary_messages = config.general.pass_binary_messages || false;
            self.isInitialized = true;
            self.initContext((err, context) => {
                try {
                    let tasks = [];
                    self.config.bolts.forEach((bolt_config) => {
                        if (bolt_config.disabled) {
                            log.logger().debug(self.logging_prefix + `Skipping disabled bolt - ${bolt_config.name}`);
                            return;
                        }
                        bolt_config.onEmit = (data, stream_id, callback) => {
                            self.redirect(bolt_config.name, data, stream_id, callback);
                        };
                        bolt_config.onError = (e) => {
                            self.onInternalError(e);
                        };
                        let bolt = null;
                        bolt = new top_inproc.TopologyBoltWrapper(bolt_config, context);
                        self.bolts.push(bolt);
                        tasks.push((xcallback) => { bolt.init(xcallback); });
                        for (let input of bolt_config.inputs) {
                            if (input.disabled) {
                                log.logger().debug(self.logging_prefix + `Skipping disabled source - ${input.source} -> ${bolt_config.name} (stream ${input.stream_id})`);
                                continue;
                            }
                            log.logger().debug(self.logging_prefix + `Establishing source - ${input.source} -> ${bolt_config.name} (stream ${input.stream_id})`);
                            self.router.register(input.source, bolt_config.name, input.stream_id);
                        }
                    });
                    self.config.spouts.forEach((spout_config) => {
                        if (spout_config.disabled) {
                            log.logger().debug(self.logging_prefix + `Skipping disabled spout - ${spout_config.name}`);
                            return;
                        }
                        spout_config.onEmit = (data, stream_id, callback) => {
                            self.redirect(spout_config.name, data, stream_id, callback);
                        };
                        spout_config.onError = (e) => {
                            self.onInternalError(e);
                        };
                        let spout = null;
                        spout = new top_inproc.TopologySpoutWrapper(spout_config, context);
                        self.spouts.push(spout);
                        tasks.push((xcallback) => { spout.init(xcallback); });
                    });
                    async.series(tasks, (err) => {
                        if (err) {
                            log.logger().error(self.logging_prefix + "Error while initializing topology");
                            log.logger().exception(err);
                        }
                        else {
                            self.runHeartbeat();
                        }
                        callback(err);
                    });
                }
                catch (e) {
                    log.logger().error(self.logging_prefix + "Error while initializing topology");
                    log.logger().exception(e);
                    callback(e);
                }
            });
        }
        catch (e) {
            callback(e);
        }
    }
    /** Sends run signal to all spouts */
    run() {
        if (!this.isInitialized) {
            throw new Error(this.logging_prefix + "Topology not initialized and cannot run.");
        }
        if (this.isRunning) {
            throw new Error(this.logging_prefix + "Topology is already running.");
        }
        log.logger().log(this.logging_prefix + "Local topology started");
        for (let spout of this.spouts) {
            spout.run();
        }
        this.isRunning = true;
    }
    /** Sends pause signal to all spouts */
    pause(callback) {
        try {
            if (!this.isInitialized) {
                throw new Error(this.logging_prefix + "Topology not initialized and cannot be paused.");
            }
            for (let spout of this.spouts) {
                spout.pause();
            }
            this.isRunning = false;
        }
        catch (e) {
            callback(e);
        }
        callback();
    }
    /** Sends shutdown signal to all child processes */
    shutdown(callback) {
        if (!this.isInitialized) {
            return callback();
        }
        let self = this;
        self.isShuttingDown = true;
        self.isRunning = false;
        // disable heartbeat
        if (self.heartbeatTimer) {
            clearInterval(self.heartbeatTimer);
        }
        self.pause((err) => {
            let tasks = [];
            self.spouts.forEach((spout) => {
                tasks.push((xcallback) => {
                    try {
                        spout.shutdown(xcallback);
                    }
                    catch (e) {
                        xcallback(e);
                    }
                });
            });
            self.bolts.forEach((bolt) => {
                tasks.push((xcallback) => {
                    try {
                        bolt.shutdown(xcallback);
                    }
                    catch (e) {
                        xcallback(e);
                    }
                });
            });
            if (self.config.general.shutdown) {
                let factory = (module_path) => {
                    return (xcallback) => {
                        try {
                            require(module_path).shutdown(xcallback);
                        }
                        catch (e) {
                            xcallback(e);
                        }
                    };
                };
                for (let shutdown_conf of self.config.general.shutdown) {
                    if (shutdown_conf.disabled)
                        continue; // skip if disabled
                    let dir = path.resolve(shutdown_conf.working_dir); // path may be relative to current working dir
                    let module_path = path.join(dir, shutdown_conf.cmd);
                    tasks.push(factory(module_path));
                }
            }
            async.series(tasks, callback);
        });
    }
    /** Returns uuid of the topology that is running. */
    getUuid() {
        return this.uuid;
    }
    /** Runs heartbeat pump until this object shuts down */
    runHeartbeat() {
        let self = this;
        self.heartbeatTimer = setInterval(() => {
            if (self.isRunning) {
                self.heartbeat();
            }
            ;
        }, self.heartbeatTimeout);
    }
    /** Sends heartbeat signal to all child processes */
    heartbeat() {
        if (!this.isInitialized) {
            return;
        }
        for (let spout of this.spouts) {
            try {
                spout.heartbeat();
            }
            catch (e) {
                log.logger().exception(e);
            }
        }
        for (let bolt of this.bolts) {
            try {
                bolt.heartbeat();
            }
            catch (e) {
                log.logger().exception(e);
            }
        }
    }
    /** This method redirects/broadcasts message from source to other nodes.
     * It is done in async/parallel manner.
     * @param {string} source - Name of the source that emitted this data
     * @param {Object} data - Data content of the message
     * @param {string} stream_id - Name of the stream that this data belongs to
     * @param {Function} callback - standard callback
     */
    redirect(source, data, stream_id, callback) {
        let self = this;
        let destinations = self.router.getDestinationsForSource(source, stream_id);
        // by default, each successor should receive a copy of current message
        // this encapsulates down-stream processing and changes.
        // This behavoir is opt-out, using let data_clone = JSON.parse(s);.
        let s = JSON.stringify(data);
        async.each(destinations, (destination, xcallback) => {
            let data_clone = data;
            if (!self.pass_binary_messages) {
                let data_clone = JSON.parse(s);
            }
            let bolt = self.getBolt(destination);
            bolt.receive(data_clone, stream_id, xcallback);
        }, callback);
    }
    /** Find bolt with given name.
     * @param {string} name - Name of the bolt that we need to find
     */
    getBolt(name) {
        let hits = this.bolts.filter(x => x.getName() == name);
        if (hits.length === 0) {
            return null;
        }
        return hits[0];
    }
    /** This method optionally runs context initialization code
     * and returns the context object.
     * @param {Function} callback - standard callback
     */
    initContext(callback) {
        let self = this;
        if (self.config.general.initialization) {
            let common_context = {};
            async.eachSeries(self.config.general.initialization, (init_conf, xcallback) => {
                try {
                    if (init_conf.disabled)
                        return xcallback(); // skip if disabled
                    let dir = path.resolve(init_conf.working_dir); // path may be relative to current working dir
                    let module_path = path.join(dir, init_conf.cmd);
                    init_conf.init = init_conf.init || {};
                    init_conf.init.$name = self.uuid;
                    require(module_path).init(init_conf.init, common_context, xcallback);
                }
                catch (e) {
                    xcallback(e);
                }
            }, (err) => {
                callback(err, common_context);
            });
        }
        else {
            callback(null, null);
        }
    }
}
exports.TopologyLocal = TopologyLocal;
////////////////////////////////////////////////////////////////////////////////////
exports.TopologyLocal = TopologyLocal;
//# sourceMappingURL=topology_local.js.map