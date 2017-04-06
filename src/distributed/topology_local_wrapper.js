"use strict";

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
        process.on('msg', (msg) => {
            if (msg.cmd === "init") {
                self._topology_local.init(msg.data, (err) => {
                    self._send("response_init", { err: err });
                });
            }
            if (msg.cmd === "run") {
                self._topology_local.run(msg.data, (err) => {
                    self._send("response_run", { err: err });
                });
            }
            if (msg.cmd === "pause") {
                self._topology_local.pause(msg.data, (err) => {
                    self._send("response_pause", { err: err });
                });
            }
            if (msg.cmd === "shutdown") {
                self._topology_local.shutdown(msg.data, (err) => {
                    self._send("response_shutdown", { err: err });
                });
            }
        });
    }


}

/////////////////////////////////////////////////////////////////////////////////////

exports.TopologyLocalWrapper = TopologyLocalWrapper;
