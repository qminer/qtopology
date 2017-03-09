"use strict";

const async = require("async");
const top_sub = require("./topology_local_subprocess");
const top_inproc = require("./topology_local_inprocess");

////////////////////////////////////////////////////////////////////

/** Class that perform redirection of messages after they are emited from nodes */
class OutputRouter {

    /** Constructor prepares the object before any information is received. */
    constructor() {
        this._sources = {};
    }

    /** This method registers binding between source and destination
     * @param {string} source - Name of source
     * @param {string} destination - Name of destination
     */
    register(source, destination) {
        if (!this._sources[source]) {
            this._sources[source] = [];
        }
        this._sources[source].push(destination);
    }

    /** Returns list of names that are destinations for data, emitted by source.
     * @param {*} source - Name of source
     */
    getDestinationsForSource(source) {
        return this._sources[source] || [];
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
    }

    /** Initialization that sets up internal structure and
     * starts underlaying processes.
     */
    init(config, callback) {
        let self = this;
        self._config = config;
        self._heartbeatTimeout = config.general.heartbeat;
        let tasks = [];
        self._config.bolts.forEach((bolt_config) => {
            if (bolt_config.disabled) {
                return;
            }
            bolt_config.onEmit = (data, callback) => {
                self._redirect(bolt_config.name, data, callback);
            };
            let bolt = null;
            if (bolt_config.type == "inproc") {
                bolt = new top_inproc.TopologyBoltInproc(bolt_config);
            } else {
                bolt = new top_sub.TopologyBolt(bolt_config);
            }
            self._bolts.push(bolt);
            tasks.push((xcallback) => { bolt.init(xcallback); });
            for (let input of bolt_config.inputs) {
                self._router.register(input.source, bolt_config.name);
            }
        });
        self._config.spouts.forEach((spout_config) => {
            if (spout_config.disabled) {
                return;
            }
            spout_config.onEmit = (data, callback) => {
                self._redirect(spout_config.name, data, callback);
            };
            let spout = null;
            if (spout_config.type == "inproc") {
                spout = new top_inproc.TopologySpoutInproc(spout_config);
            } else {
                spout = new top_sub.TopologySpout(spout_config);
            }
            self._spouts.push(spout);
            tasks.push((xcallback) => { spout.init(xcallback); });
        });
        self._runHeartbeat();
        async.series(tasks, callback);
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
        this._isShuttingDown = true;
        this.pause((err) => {
            let tasks = [];
            this._spouts.forEach((spout) => {
                tasks.push((xcallback) => {
                    spout.shutdown(xcallback);
                });
            });
            this._bolts.forEach((bolt) => {
                tasks.push((xcallback) => {
                    bolt.shutdown(xcallback);
                });
            });
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
                setTimeout(
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
     * @param {Function} callback - standard callback
     */
    _redirect(source, data, callback) {
        let self = this;
        let destinations = self._router.getDestinationsForSource(source);
        async.each(
            destinations,
            (destination, xcallback) => {
                let data_clone = {};
                Object.assign(data_clone, data);
                self._getBolt(destination).send(data_clone, xcallback);
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
}

////////////////////////////////////////////////////////////////////////////////////

exports.TopologyLocal = TopologyLocal;
