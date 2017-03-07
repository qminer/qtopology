"use strict";

const tsm = require("./topology_msgs");
const tl = require("./topology_local");

////////////////////////////////////////////////////////////////////////////

/** This class handles topology initialization and run-time. */
class TopologyWorker {

    /** Initializes this object */
    constructor(options) {
        this._name = options.name;
        this._port = options.port;
        this._cport = options.cport;
        this._chost = options.chost;
        this._local_topology = new tl.TopologyLocal();
    }

    /** Starts topology worker by openning communication with coordinator */
    start() {
        let self = this;
        let client = tsm.createClient(
            this._cport,
            this._chost, () => { console.log("Communication to coordinator established"); });

        client.on('data', (msg) => {
            if (msg.cmd == "init") {
                self._init(msg, client);
            } else if (msg.cmd == "introduce") {
                self._introduce(msg, client);
            } else if (msg.cmd == "run") {
                self._run(msg, client);
            } else if (msg.cmd == "pause") {
                self._pause(msg, client);
            } else if (msg.cmd == "shutdown") {
                self._shutdown();
            }
        });
        client.on('error', () => { self._disconnect(); });
        client.on('close', () => { self._disconnect(); });
    }

    /** Introduces itself to coordinator */
    _introduce(msg, client) {
        client.write({ cmd: "register", name: this._name, port: this._port });
    }

    /** Initializes the internal, local topology */
    _init(msg, client) {
        try {
            console.log("received init");
            this._local_topology.init(msg.data, (err) => {
                if (err) {
                    client.write({ cmd: "init_failed", error: err.message });
                } else {
                    client.write({ cmd: "init_confirmed" });
                }
            });
        } catch (err) {
            console.log(err);
            client.write({ cmd: "init_failed", error: err.message });
        }
    }

    /** Runs established topology */
    _run(msg, client) {
        console.log('received run');
        this._local_topology.run(() => { });
    }

    /** Stops topology by disabling the spouts */
    _pause(msg, client) {
        console.log('received pause');
        this._local_topology.pause(() => { });
    }

    /** Handles event when communication with coordinator was broken. */
    _disconnect() {
        console.log('Topology disconnected');
        this._shutdown();
    }

    /** Shuts down the worker and all its subprocesses. */
    _shutdown() {
        console.log('Shutting down');
        this._local_topology.shutdown(() => {
            process.exit(0);
        });
    }
}

//////////////////////////////////////////////////////////

exports.TopologyWorker = TopologyWorker;
