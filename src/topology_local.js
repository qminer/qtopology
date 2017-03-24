"use strict";

const async = require("async");
const path = require("path");
const top_sub = require("./topology_local_subprocess");
const top_inproc = require("./topology_local_inprocess");

////////////////////////////////////////////////////////////////////

/** Class that performs redirection of messages after they are emited from nodes */
class OutputRouter {

    /** Constructor prepares the object before any information is received. */
    constructor() {
        this._sources = {};
    }

    /** This method registers binding between source and destination
     * @param {string} source - Name of source
     * @param {string} destination - Name of destination
     * @param {string} stream_id - Stream ID used for routing
     */
    register(source, destination, stream_id) {
        if (!this._sources[source]) {
            this._sources[source] = [];
        }
        this._sources[source].push({ destination: destination, stream_id: stream_id || null });
    }

    /** Returns list of names that are destinations for data, emitted by source.
     * @param {*} source - Name of source
     * @param {string} stream_id - Stream ID used for routing
     */
    getDestinationsForSource(source, stream_id) {
        if (!this._sources[source]) {
            return [];
        }
        return this._sources[source]
            .filter(x => { return x.stream_id == stream_id; })
            .map(x => x.destination);
    }
}

/** This class runs local topology */
class TopologyLocal {

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
    init(config, callback) {
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
                if (bolt_config.type == "sys" || bolt_config.type == "inproc") {
                    bolt = new top_inproc.TopologyBoltInproc(bolt_config, context);
                } else {
                    bolt = new top_sub.TopologyBolt(bolt_config, context);
                }
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

                if (spout_config.type == "sys" || spout_config.type == "inproc") {
                    spout = new top_inproc.TopologySpoutInproc(spout_config, context);
                } else {
                    spout = new top_sub.TopologySpout(spout_config, context);
                }
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
    pause(callback) {
        for (let spout of this._spouts) {
            spout.pause();
        }
        this._isRunning = false;
        callback();
    }

    /** Sends shutdown signal to all child processes */
    shutdown(callback) {
        let self = this;
        self._isShuttingDown = true;
        if (self._heartbeatTimer) {
            clearInterval(self._heartbeatTimer);
            self._heartbeatCallback()
        };
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
                let shutdown_conf = self._config.general.shutdown;
                let dir = path.resolve(shutdown_conf.working_dir); // path may be relative to current working dir
                let module_path = path.join(dir, shutdown_conf.cmd);
                tasks.push((xcallback) => { require(module_path).shutdown(xcallback); });
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
    _redirect(source, data, stream_id, callback) {
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
    _getBolt(name) {
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
    _initContext(callback) {
        let self = this;
        if (self._config.general.initialization) {
            let init_conf = self._config.general.initialization;
            let dir = path.resolve(init_conf.working_dir); // path may be relative to current working dir
            let module_path = path.join(dir, init_conf.cmd);
            require(module_path).init(init_conf.init, (err, context) => {
                if (err) { return callback(err); }
                callback(null, context);
            });
        } else {
            callback(null, null);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyLocal = TopologyLocal;
