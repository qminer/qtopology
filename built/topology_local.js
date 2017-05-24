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
    constructor() {
        this.spouts = [];
        this.bolts = [];
        this.config = null;
        this.name = null;
        this.heartbeatTimeout = 10000;
        this.router = new OutputRouter();
        this.isRunning = false;
        this.isShuttingDown = false;
        this.isInitialized = false;
        this.heartbeatTimer = null;
        this.heartbeatCallback = null;
    }
    /** Initialization that sets up internal structure and
     * starts underlaying processes.
     */
    init(config, callback) {
        let self = this;
        self.config = config;
        self.name = config.general.name;
        self.heartbeatTimeout = config.general.heartbeat;
        self.isInitialized = true;
        self.initContext((err, context) => {
            let tasks = [];
            self.config.bolts.forEach((bolt_config) => {
                if (bolt_config.disabled) {
                    return;
                }
                bolt_config.onEmit = (data, stream_id, callback) => {
                    self.redirect(bolt_config.name, data, stream_id, callback);
                };
                let bolt = null;
                bolt = new top_inproc.TopologyBoltInproc(bolt_config, context);
                self.bolts.push(bolt);
                tasks.push((xcallback) => { bolt.init(xcallback); });
                for (let input of bolt_config.inputs) {
                    self.router.register(input.source, bolt_config.name, input.stream_id);
                }
            });
            self.config.spouts.forEach((spout_config) => {
                if (spout_config.disabled) {
                    return;
                }
                spout_config.onEmit = (data, stream_id, callback) => {
                    self.redirect(spout_config.name, data, stream_id, callback);
                };
                let spout = null;
                spout = new top_inproc.TopologySpoutInproc(spout_config, context);
                self.spouts.push(spout);
                tasks.push((xcallback) => { spout.init(xcallback); });
            });
            self.runHeartbeat();
            async.series(tasks, callback);
        });
    }
    /** Sends run signal to all spouts */
    run() {
        if (!this.isInitialized) {
            throw new Error("Topology not initialized and cannot run.");
        }
        log.logger().log("Local topology started");
        for (let spout of this.spouts) {
            spout.run();
        }
        this.isRunning = true;
    }
    /** Sends pause signal to all spouts */
    pause(callback) {
        if (!this.isInitialized) {
            throw new Error("Topology not initialized and cannot be paused.");
        }
        for (let spout of this.spouts) {
            spout.pause();
        }
        this.isRunning = false;
        callback();
    }
    /** Sends shutdown signal to all child processes */
    shutdown(callback) {
        if (!this.isInitialized) {
            return callback();
        }
        let self = this;
        self.isShuttingDown = true;
        // disable heartbeat
        if (self.heartbeatTimer) {
            clearInterval(self.heartbeatTimer);
            self.heartbeatCallback();
        }
        self.pause((err) => {
            let tasks = [];
            self.spouts.forEach((spout) => {
                tasks.push((xcallback) => {
                    spout.shutdown(xcallback);
                });
            });
            self.bolts.forEach((bolt) => {
                tasks.push((xcallback) => {
                    bolt.shutdown(xcallback);
                });
            });
            if (self.config.general.shutdown) {
                let factory = (module_path) => {
                    return (xcallback) => {
                        require(module_path).shutdown(xcallback);
                    };
                };
                for (let shutdown_conf of self.config.general.shutdown) {
                    let dir = path.resolve(shutdown_conf.working_dir); // path may be relative to current working dir
                    let module_path = path.join(dir, shutdown_conf.cmd);
                    tasks.push(factory(module_path));
                }
            }
            async.series(tasks, callback);
        });
    }
    /** Runs heartbeat pump until this object shuts down */
    runHeartbeat() {
        let self = this;
        async.whilst(() => {
            return !self.isShuttingDown;
        }, (xcallback) => {
            self.heartbeatCallback = xcallback;
            self.heartbeatTimer = setTimeout(() => {
                if (self.isRunning) {
                    self.heartbeat();
                }
                xcallback();
            }, self.heartbeatTimeout);
        }, () => { });
    }
    /** Sends heartbeat signal to all child processes */
    heartbeat() {
        if (!this.isInitialized) {
            return;
        }
        for (let spout of this.spouts) {
            spout.heartbeat();
        }
        for (let bolt of this.bolts) {
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
    redirect(source, data, stream_id, callback) {
        let self = this;
        let destinations = self.router.getDestinationsForSource(source, stream_id);
        // each successor should receive a copy of current message
        // this encapsulates down-stream processing and changes
        async.each(destinations, (destination, xcallback) => {
            let data_clone = {};
            Object.assign(data_clone, data);
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
                let dir = path.resolve(init_conf.working_dir); // path may be relative to current working dir
                let module_path = path.join(dir, init_conf.cmd);
                init_conf.init = init_conf.init || {};
                init_conf.init.$name = self.name;
                require(module_path).init(init_conf.init, common_context, xcallback);
            }, (err) => {
                callback(null, common_context);
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