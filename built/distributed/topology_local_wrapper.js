"use strict";
var topology_compiler = require("../topology_compiler");
var topology_local = require("../topology_local");
////////////////////////////////////////////////////////////////////////////////////
/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
var TopologyLocalWrapper = (function () {
    /** Constructor that sets up call routing */
    function TopologyLocalWrapper() {
        var self = this;
        this._topology_local = new topology_local.TopologyLocal();
        process.on('message', function (msg) {
            self._handle(msg);
        });
    }
    /** Starts infinite loop by reading messages from parent or console */
    TopologyLocalWrapper.prototype.start = function () {
        var self = this;
        process.openStdin().addListener("data", function (d) {
            try {
                d = d.toString().trim();
                var i = d.indexOf(" ");
                if (i > 0) {
                    self._handle(d.substr(0, i), JSON.parse(d.substr(i)));
                }
                else {
                    self._handle(d, {});
                }
            }
            catch (e) {
                console.error(e);
            }
        });
    };
    /** Internal main handler for incoming messages */
    TopologyLocalWrapper.prototype._handle = function (msg) {
        var self = this;
        if (msg.cmd === "init") {
            var compiler = new topology_compiler.TopologyCompiler(msg.data);
            compiler.compile();
            var topology = compiler.getWholeConfig();
            self._topology_local.init(topology, function (err) {
                self._topology_local.run();
                self._send("response_init", { err: err });
            });
        }
        if (msg.cmd === "run") {
            self._topology_local.run(function (err) {
                self._send("response_run", { err: err });
            });
        }
        if (msg.cmd === "pause") {
            self._topology_local.pause(function (err) {
                self._send("response_pause", { err: err });
            });
        }
        if (msg.cmd === "shutdown") {
            console.log("Shutting down topology", self._topology_local._config.general.name);
            self._topology_local.shutdown(function (err) {
                self._send("response_shutdown", { err: err });
                process.exit(0);
            });
        }
    };
    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    TopologyLocalWrapper.prototype._send = function (cmd, data) {
        if (process.send) {
            process.send({ cmd: cmd, data: data });
        }
        else {
            // we're running in dev/test mode as a standalone process
            console.log("Sending command", { cmd: cmd, data: data });
        }
    };
    return TopologyLocalWrapper;
}());
/////////////////////////////////////////////////////////////////////////////////////
exports.TopologyLocalWrapper = TopologyLocalWrapper;
var wr = new TopologyLocalWrapper();
wr.start();
