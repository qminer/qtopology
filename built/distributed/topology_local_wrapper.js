"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const topology_compiler = require("../topology_compiler");
const tl = require("../topology_local");
const intf = require("../topology_interfaces");
const log = require("../util/logger");
/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
class TopologyLocalWrapper {
    /** Constructor that sets up call routing */
    constructor() {
        let self = this;
        this.topology_local = new tl.TopologyLocal();
        process.on("message", (msg) => {
            self.handle(msg);
        });
        process.on("unhandeledException", (e) => {
            self.handle({
                cmd: intf.ParentMsgCode.shutdown,
                data: e
            });
        });
        process.on('SIGINT', () => {
            // this process should not handle this signal
            // it means that parent process (the worker) also got this signal
            // and it will start the proper shutdown sequence shortly
            log.logger().warn("[Wrapper] Received SIGINT");
        });
    }
    /** Starts infinite loop by reading messages from parent or console */
    start() {
        let self = this;
    }
    /** Internal main handler for incoming messages */
    handle(msg) {
        let self = this;
        if (msg.cmd === intf.ParentMsgCode.init) {
            log.logger().important("[Local wrapper] Initializing topology " + msg.data.general.name);
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
            log.logger().important("[Local wrapper] Shutting down topology " + self.name);
            self.topology_local.shutdown((err) => {
                // if we are shutting down due to unhandeled exception,
                // we have the original error from the data field of the message
                self.send(intf.ChildMsgCode.response_shutdown, { err: err || msg.data });
                setTimeout(() => {
                    //process.exit(0);
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