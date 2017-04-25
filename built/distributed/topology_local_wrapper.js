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
        this.topology_local = new tl.TopologyLocal();
        process.on('message', (msg) => {
            self.handle(msg);
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
    handle(msg) {
        let self = this;
        if (msg.cmd === intf.ParentMsgCode.init) {
            console.log("[Local wrapper] Initializing topology", msg.data.general.name);
            self.name = msg.data.general.name;
            let compiler = new topology_compiler.TopologyCompiler(msg.data);
            compiler.compile();
            let topology = compiler.getWholeConfig();
            self.topology_local.init(topology, (err) => {
                self.topology_local.run();
                self.send(intf.ChildMsgCode.response_init, { err: err });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.run) {
            self.topology_local.run();
            self.send(intf.ChildMsgCode.response_run, {});
        }
        if (msg.cmd === intf.ParentMsgCode.pause) {
            self.topology_local.pause((err) => {
                self.send(intf.ChildMsgCode.response_pause, { err: err });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.shutdown) {
            console.log("[Local wrapper] Shutting down topology", self.name);
            self.topology_local.shutdown((err) => {
                self.send(intf.ChildMsgCode.response_shutdown, { err: err });
                setTimeout(() => {
                    process.exit(0);
                }, 100);
            });
        }
    }
    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    send(cmd, data) {
        if (process.send) {
            process.send({ cmd: cmd, data: data });
        }
        else {
            // we're running in dev/test mode as a standalone process
            console.log("[Local wrapper] Sending command", { cmd: cmd, data: data });
        }
    }
}
/////////////////////////////////////////////////////////////////////////////////////
// start worker and listen for messages from parent
let wr = new TopologyLocalWrapper();
wr.start();
//# sourceMappingURL=topology_local_wrapper.js.map