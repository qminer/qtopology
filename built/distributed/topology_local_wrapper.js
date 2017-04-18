"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const topology_compiler = require("../topology_compiler");
const tl = require("../topology_local");
const intf = require("../topology_interfaces");
/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
class TopologyLocalWrapper {
    /** Constructor that sets up call routing */
    constructor() {
        let self = this;
        this._topology_local = new tl.TopologyLocal();
        process.on('message', (msg) => {
            self._handle(msg);
        });
    }
    /** Starts infinite loop by reading messages from parent or console */
    start() {
        let self = this;
        // process.stdin.addListener("data", function (d) {
        //     try {
        //         d = d.toString().trim();
        //         let i = d.indexOf(" ");
        //         if (i > 0) {
        //             self._handle({
        //                 cmd: d.substr(0, i),
        //                 data: JSON.parse(d.substr(i))
        //             });
        //         } else {
        //             self._handle({ cmd: d, data: {} });
        //         }
        //     } catch (e) {
        //         console.error(e);
        //     }
        // });
    }
    /** Internal main handler for incoming messages */
    _handle(msg) {
        let self = this;
        if (msg.cmd === intf.ParentMsgCode.init) {
            console.log("Initializing topology", msg.data.general.name);
            self._name = msg.data.general.name;
            let compiler = new topology_compiler.TopologyCompiler(msg.data);
            compiler.compile();
            let topology = compiler.getWholeConfig();
            self._topology_local.init(topology, (err) => {
                self._topology_local.run();
                self._send(intf.ChildMsgCode.response_init, { err: err });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.run) {
            self._topology_local.run();
            self._send(intf.ChildMsgCode.response_run, {});
        }
        if (msg.cmd === intf.ParentMsgCode.pause) {
            self._topology_local.pause((err) => {
                self._send(intf.ChildMsgCode.response_pause, { err: err });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.shutdown) {
            console.log("Shutting down topology", self._name);
            self._topology_local.shutdown((err) => {
                self._send(intf.ChildMsgCode.response_shutdown, { err: err });
                //process.exit(0); - will be killed by parent process
            });
        }
    }
    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    _send(cmd, data) {
        if (process.send) {
            process.send({ cmd: cmd, data: data });
        }
        else {
            // we're running in dev/test mode as a standalone process
            console.log("Sending command", { cmd: cmd, data: data });
        }
    }
}
/////////////////////////////////////////////////////////////////////////////////////
// start worker and listen for messages from parent
let wr = new TopologyLocalWrapper();
wr.start();
//# sourceMappingURL=topology_local_wrapper.js.map