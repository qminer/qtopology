"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const path = require("path");
const top_inproc = require("./topology_local_inprocess");
const log = require("./util/logger");
const callback_wrappers_1 = require("./util/callback_wrappers");
const strip_json_comments_1 = require("./util/strip_json_comments");
const topology_validation_1 = require("./topology_validation");
const topology_compiler_1 = require("./topology_compiler");
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
        this.shutdownHardCalled = false;
        this.heartbeatTimer = null;
        this.logging_prefix = null;
        this.onErrorHandler = onError || (() => { });
        this.onErrorHandler = callback_wrappers_1.tryCallback(this.onErrorHandler);
    }
    /** Handler for all internal errors */
    onInternalError(e) {
        this.onErrorHandler(e);
    }
    /** Initialization that sets up internal structure and
     * starts underlaying processes.
     */
    init(uuid, config, callback) {
        callback = callback_wrappers_1.tryCallback(callback);
        try {
            let self = this;
            if (self.isInitialized) {
                return callback(new Error(self.logging_prefix + "Already initialized"));
            }
            self.config = config;
            self.uuid = uuid;
            self.logging_prefix = `[TopologyLocal ${uuid}] `;
            self.heartbeatTimeout = config.general.heartbeat;
            self.pass_binary_messages = config.general.pass_binary_messages || false;
            self.isInitialized = true;
            self.initContext((err, context) => {
                if (err) {
                    return callback(err);
                }
                try {
                    let tasks = [];
                    self.config.bolts.forEach((bolt_config) => {
                        if (bolt_config.disabled) {
                            log.logger().debug(self.logging_prefix + `Skipping disabled bolt - ${bolt_config.name}`);
                            return;
                        }
                        bolt_config.onEmit = (data, stream_id, xcallback) => {
                            self.redirect(bolt_config.name, data, stream_id, xcallback);
                        };
                        bolt_config.onError = (e) => {
                            self.onInternalError(e);
                        };
                        let bolt = new top_inproc.TopologyBoltWrapper(bolt_config, context);
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
                        spout_config.onEmit = (data, stream_id, xcallback) => {
                            self.redirect(spout_config.name, data, stream_id, xcallback);
                        };
                        spout_config.onError = (e) => {
                            self.onInternalError(e);
                        };
                        let spout = new top_inproc.TopologySpoutWrapper(spout_config, context);
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
                        return callback(err);
                    });
                }
                catch (e) {
                    log.logger().error(self.logging_prefix + "Error while initializing topology");
                    log.logger().exception(e);
                    return callback(e);
                }
            });
        }
        catch (e) {
            return callback(e);
        }
    }
    /** Sends run signal to all spouts. Each spout.run is idempotent */
    run(callback) {
        callback = callback_wrappers_1.tryCallback(callback);
        if (!this.isInitialized) {
            return callback(new Error(this.logging_prefix + "Topology not initialized and cannot run."));
        }
        if (this.isRunning) {
            return callback(new Error(this.logging_prefix + "Topology is already running."));
        }
        this.isRunning = true;
        log.logger().log(this.logging_prefix + "Local topology started");
        // spouts pass internal exceptions to errorCallback
        // no exceptions are expected to be thrown here
        for (let spout of this.spouts) {
            spout.run();
        }
        return callback();
    }
    /** Sends pause signal to all spouts. Each spout.pause is idempotent  */
    pause(callback) {
        callback = callback_wrappers_1.tryCallback(callback);
        if (!this.isInitialized) {
            return callback(new Error(this.logging_prefix + "Topology not initialized and cannot be paused."));
        }
        if (!this.isRunning) {
            return callback(new Error(this.logging_prefix + "Topology is already paused."));
        }
        this.isRunning = false;
        // spouts pass internal exceptions to errorCallback
        // no exceptions are expected to be thrown here
        for (let spout of this.spouts) {
            spout.pause();
        }
        return callback();
    }
    /** Sends shutdown signal to all child processes */
    shutdown(callback) {
        callback = callback_wrappers_1.tryCallback(callback);
        if (!this.isInitialized) {
            return callback(new Error(this.logging_prefix + "Topology not initialized and cannot shutdown."));
        }
        if (this.isShuttingDown) {
            // without an exception the caller will think that everything shut down nicely already when we call shutdown twice by mistake
            return callback(new Error(this.logging_prefix + "Topology is already shutting down."));
        }
        let self = this;
        self.isShuttingDown = true;
        // disable heartbeat
        if (self.heartbeatTimer) {
            clearInterval(self.heartbeatTimer);
        }
        let shutdownTasks = () => {
            let tasks = [];
            for (let spout of self.spouts) {
                tasks.push((xcallback) => {
                    try {
                        spout.shutdown(xcallback);
                    }
                    catch (e) {
                        xcallback(e);
                    }
                });
            }
            ;
            for (let bolt of self.bolts) {
                tasks.push((xcallback) => {
                    try {
                        bolt.shutdown(xcallback);
                    }
                    catch (e) {
                        xcallback(e);
                    }
                });
            }
            ;
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
            async.series(tasks, (e) => {
                // call hard shutdown regardless of the error
                if (self.config.general.shutdown_hard) {
                    try {
                        self.shutdownHard();
                    }
                    catch (e) {
                        log.logger().exception(e);
                        /* do nothing extra */
                    }
                }
                callback(e);
            });
        };
        if (self.isRunning) {
            self.pause((err) => {
                if (err) {
                    // only possible error is when isInit is false
                    log.logger().error("THIS SHOULD NOT HAPPEN!");
                    log.logger().exception(err);
                    return callback(err);
                }
                shutdownTasks();
            });
        }
        else {
            shutdownTasks();
        }
    }
    /** Runs hard-core shutdown sequence */
    shutdownHard() {
        if (this.config.general.shutdown_hard) {
            if (this.shutdownHardCalled)
                return;
            this.shutdownHardCalled = true;
            for (let shutdown_conf of this.config.general.shutdown_hard) {
                try {
                    if (shutdown_conf.disabled)
                        continue; // skip if disabled
                    let dir = path.resolve(shutdown_conf.working_dir); // path may be relative to current working dir
                    let module_path = path.join(dir, shutdown_conf.cmd);
                    require(module_path).shutdown_hard();
                }
                catch (e) {
                    log.logger().exception(e);
                    // just swallow the error
                }
            }
        }
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
                // All exceptions should have been caught and passed to errorCallback
                log.logger().error("THIS SHOULD NOT HAPPEN!");
                log.logger().exception(e);
                return this.onInternalError(e);
            }
        }
        for (let bolt of this.bolts) {
            try {
                bolt.heartbeat();
            }
            catch (e) {
                // All exceptions should have been caught and passed to errorCallback
                log.logger().error("THIS SHOULD NOT HAPPEN!");
                log.logger().exception(e);
                return this.onInternalError(e);
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
        // This behavoir is opt-out, using "pass_binary_messages".
        let s = JSON.stringify(data);
        async.each(destinations, (destination, xcallback) => {
            let data_clone = data;
            if (!self.pass_binary_messages) {
                data_clone = JSON.parse(s);
            }
            let bolt = self.getBolt(destination);
            try {
                bolt.receive(data_clone, stream_id, xcallback);
            }
            catch (e) {
                return xcallback(e);
            }
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
                    if (init_conf.disabled) {
                        // skip if disabled
                        return xcallback();
                    }
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
//////////////////////////////////////////////////////////////////////////////////////////////////
function runLocalTopologyFromFile(file_name) {
    let config = strip_json_comments_1.readJsonFileSync(file_name);
    topology_validation_1.validate({ config: config, exitOnError: true });
    let comp = new topology_compiler_1.TopologyCompiler(config);
    comp.compile();
    config = comp.getWholeConfig();
    let topology = new TopologyLocal();
    async.series([
        (xcallback) => {
            topology.init("topology.1", config, xcallback);
        },
        (xcallback) => {
            console.log("Init done");
            topology.run(xcallback);
        }
    ], (err) => {
        if (err) {
            console.log("Error in shutdown", err);
        }
        console.log("Running");
    });
    function shutdown() {
        if (topology) {
            topology.shutdown((err) => {
                if (err) {
                    console.log("Error", err);
                }
                process.exit(1);
            });
            topology = null;
        }
    }
    //do something when app is closing
    process.on('exit', shutdown);
    //catches ctrl+c event
    process.on('SIGINT', shutdown);
    //catches uncaught exceptions
    process.on('uncaughtException', (e) => {
        console.log(e);
        process.exit(1);
    }
    //shutdown
    );
}
exports.runLocalTopologyFromFile = runLocalTopologyFromFile;
//# sourceMappingURL=topology_local.js.map