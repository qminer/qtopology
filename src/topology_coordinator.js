"use strict";

const fs = require("fs");
const validator = require("./topology_validation");
const tsm = require("./topology_msgs");
const tc = require("./topology_compiler");

////////////////////////////////////////////////////////////////////////////

/** This class performs TCP coordination */
class TopologyListener {

    /** Constructor for getting  */
    constructor(options) {
        this._clients = [];

        this._name2client = {};
        this._registrations = 0;
        this._initializations = 0;
        this._worker_names = [];

        this._compiler = options.compiler;

        for (let worker_name of this._compiler.getWorkerNames()) {
            this._name2client[worker_name] = {
                name: worker_name,
                registered: false,
                initialized: false,
                deleted: false,
                client: null,
                address: null
            };
            this._worker_names.push(worker_name);
        }
    }

    /** Start listening on given port */
    listen(port) {
        let self = this;
        console.log("Opening server on port " + port);
        let server = tsm.createServer(function (client) {
            console.log('new client connected');

            client.on('error', () => {
                console.log('client error');
                self._removeClient(client);
            });
            client.on('close', () => {
                console.log('client close');
                self._removeClient(client);
            });
            client.on('data', (msg) => {
                if (msg.cmd == "register") {
                    self._register(msg, client);
                } else if (msg.cmd == "init_confirmed") {
                    self._confirmInit(msg, client);
                }
                // TODO init_failed

            });
            // ok, start handshake
            client.write({ cmd: "introduce" });
        });
        server.listen(port);
    }

    /** Remove given client from topology. */
    _removeClient(client) {
        let self = this;
        for (let name of this._worker_names) {
            let rec = this._name2client[name];
            if (rec.client == client) {
                console.error(`Worker disconnected: ${rec.name}`);
                rec.client = null;
                rec.deleted = true;
                break;
            }
        }
    }

    /** Registers new client */
    _register(msg, client) {
        let self = this;
        let name = msg.name;
        let rec = this._name2client[name];
        if (!rec) {
            throw new Error("Worker tried to register with unknown name: " + name);
        }
        if (rec.registered) {
            // we have a collission, someone registered with this name before
            console.error("Topology-registration collission: worker registered before");
            console.error("Existing registration: " + client.address);
            console.error("New registration: " + client.address);
            return;
        }
        console.log(`Worker ${name} registered.`);
        rec.registered = true;
        rec.client = client;
        rec.address = client.address;
        this._compiler.setWorkerAddress(name, rec.address);
        this._registrations++;
        if (this._registrations == this._worker_names.length) {
            // ok, all workers are registered, send init
            console.log("Received all registrations, initializing all workers...");
            for (let name of this._worker_names) {
                client.write({ cmd: "init", data: this._compiler.getConfigForWorker(name) });
            }
        }
    }

    /** Confirms init was successfull for given worker */
    _confirmInit(msg, client) {
        let self = this;
        for (let name of this._worker_names) {
            let rec = this._name2client[name];
            if (rec.client == client) {
                rec.initialized = true;
                this._initializations++;
                break;
            }
        }

        if (this._initializations == this._worker_names.length) {
            // ok, all workers are initialized, send run
            console.log("All initializations complete, sending 'run' command...");
            for (let name of this._worker_names) {
                client.write({ cmd: "run" });
            }
        }
    }
}


/** Top class for topology coordination */
class TopologyCoordinator {

    /** Constructor for this object */
    constructor(fname) {
        this._fname = fname;
        this._compiler = null;
        this._listener = null;
    }

    /** Starts the topology */
    start() {
        let self = this;

        // read topology from file and validate it
        let config = fs.readFileSync(this._fname);
        config = JSON.parse(config);
        validator.validate({
            config: config,
            exitOnError: true
        });

        // compile and check topology
        this._compiler = new tc.TopologyCompiler(config);
        this._compiler.compile();

        // create listener for coordination messages
        this._listener = new TopologyListener({
            compiler: this._compiler
        });
        this._listener.listen(config.general.coordination_port);
    }
}

///////////////////////////////////////////////////////////////////////

exports.TopologyCoordinator = TopologyCoordinator;
