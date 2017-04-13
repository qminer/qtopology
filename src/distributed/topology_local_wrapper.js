"use strict";

const topology_compiler = require("../topology_compiler");
const topology_local = require("../topology_local");

////////////////////////////////////////////////////////////////////////////////////

/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
class TopologyLocalWrapper {

    /** Constructor that sets up call routing */
    constructor() {
        let self = this;
        this._topology_local = new topology_local.TopologyLocal();
        process.on('message', (msg) => {
            if (msg.cmd === "init") {
                let compiler = new topology_compiler.TopologyCompiler(msg.data);
                compiler.compile();
                let topology = compiler.getWholeConfig();
                self._topology_local.init(topology, (err) => {
                    self._topology_local.run();
                    self._send("response_init", { err: err });
                });
            }
            if (msg.cmd === "run") {
                self._topology_local.run((err) => {
                    self._send("response_run", { err: err });
                });
            }
            if (msg.cmd === "pause") {
                self._topology_local.pause((err) => {
                    self._send("response_pause", { err: err });
                });
            }
            if (msg.cmd === "shutdown") {
                self._topology_local.shutdown((err) => {
                    self._send("response_shutdown", { err: err });
                    process.exit(0);
                });
            }
        });
    }

    /** Starts infinite loop by reading messages from parent or console */
    start() {
        let self = this;
        process.openStdin().addListener("data", function (d) {
            try {
                d = d.toString().trim();
                let i = d.indexOf(" ");
                if (i > 0) {
                    self._handle(d.substr(0, i), JSON.parse(d.substr(i)));
                } else {
                    self._handle(d, {});
                }
            } catch (e) {
                console.error(e);
            }
        });
    }

    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    _send(cmd, data) {
        if (process.send) {
            process.send({ cmd: cmd, data: data });
        } else {
            // we're running in dev/test mode as a standalone process
            console.log("Sending command", { cmd: cmd, data: data });
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////

exports.TopologyLocalWrapper = TopologyLocalWrapper;


let wr = new TopologyLocalWrapper();
wr.start();

