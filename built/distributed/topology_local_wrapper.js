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
        this.topology_local = null;
        this.waiting_for_shutdown = false;
        this.lastPing = Date.now();
        this.log_prefix = "[Wrapper] ";
        process.on("message", (msg) => {
            self.handle(msg);
        });
        process.on("uncaughtException", (e) => {
            log.logger().error(self.log_prefix + "Unhandeled error in topology wrapper: " + e);
            log.logger().exception(e);
            self.shutdown();
        });
        process.on('SIGINT', () => {
            log.logger().warn(self.log_prefix + "Received SIGINT, this process id = " + process.pid);
            self.shutdown();
        });
        process.on('SIGTERM', () => {
            log.logger().warn(self.log_prefix + "Received SIGTERM, this process id = " + process.pid);
            self.shutdown();
        });
        this.pingIntervalId = setInterval(() => {
            if (!process.connected) {
                log.logger().error(`${self.log_prefix}Connected property in child process (pid=${process.pid}) is false, shutting down topology.`);
                self.shutdown();
                return;
            }
            let now = Date.now();
            if (now - this.lastPing > 20 * 1000) {
                log.logger().error(`${self.log_prefix}Ping inside child process (pid=${process.pid}) was not received from parent in predefined interval, shutting down topology.`);
                self.shutdown();
            }
        }, 3000);
    }
    /** Starts infinite loop by reading messages from parent or console */
    start() {
        let self = this;
    }
    /** Internal main handler for incoming messages */
    handle(msg) {
        let self = this;
        if (msg.cmd === intf.ParentMsgCode.init) {
            if (self.topology_local) {
                let s = `Init called in the child process (${msg.data.general.uuid}), but the topology is already running (${self.topology_local.getUuid()}).`;
                log.logger().error(self.log_prefix + s);
                self.sendToParent(intf.ChildMsgCode.response_init, { err: new Error(s) });
                return;
            }
            log.logger().important(self.log_prefix + "Initializing topology " + msg.data.general.uuid);
            self.uuid = msg.data.general.uuid;
            self.log_prefix = `[Wrapper ${self.uuid}] `;
            delete msg.data.general.uuid;
            let compiler = new topology_compiler.TopologyCompiler(msg.data);
            compiler.compile();
            let topology = compiler.getWholeConfig();
            self.topology_local = new tl.TopologyLocal();
            self.topology_local.init(self.uuid, topology, (err) => {
                self.sendToParent(intf.ChildMsgCode.response_init, { err: err });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.ping) {
            this.lastPing = Date.now();
            self.sendToParent(intf.ChildMsgCode.response_ping, {});
        }
        if (msg.cmd === intf.ParentMsgCode.run) {
            if (!self.topology_local) {
                let s = `Run called in the child process, but the topology hasn't been initialized yet.`;
                log.logger().error(self.log_prefix + s);
                self.sendToParent(intf.ChildMsgCode.response_run, { err: new Error(s) });
                return;
            }
            self.topology_local.run();
            self.sendToParent(intf.ChildMsgCode.response_run, {});
        }
        if (msg.cmd === intf.ParentMsgCode.pause) {
            if (!self.topology_local) {
                let s = `Pause called in the child process, but the topology hasn't been initialized yet.`;
                log.logger().error(self.log_prefix + s);
                self.sendToParent(intf.ChildMsgCode.response_pause, { err: new Error(s) });
                return;
            }
            self.topology_local.pause((err) => {
                self.sendToParent(intf.ChildMsgCode.response_pause, { err: err });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.shutdown) {
            if (!self.topology_local) {
                let s = `Shutdown called in the child process, but the topology hasn't been initialized yet.`;
                log.logger().error(self.log_prefix + s);
                self.sendToParent(intf.ChildMsgCode.response_shutdown, { err: new Error(s) });
                setTimeout(() => {
                    log.logger().important(self.log_prefix + "Stopping the topology process from the child");
                    process.exit(0);
                }, 0);
                return;
            }
            self.shutdown();
        }
    }
    /** This method shuts down the local topology */
    shutdown() {
        try {
            let self = this;
            if (self.waiting_for_shutdown) {
                return;
            }
            if (this.pingIntervalId) {
                clearInterval(this.pingIntervalId);
                this.pingIntervalId = null;
            }
            self.waiting_for_shutdown = true;
            log.logger().important(self.log_prefix + `Shutting down topology ${self.uuid}, process id = ${process.pid}`);
            self.topology_local.shutdown((err) => {
                // if we are shutting down due to unhandeled exception,
                // we have the original error from the data field of the message
                if (err) {
                    log.logger().error(self.log_prefix + "Error in shutdown");
                    log.logger().exception(err);
                }
                self.sendToParent(intf.ChildMsgCode.response_shutdown, { err: err });
                setTimeout(() => {
                    log.logger().important(self.log_prefix + "Stopping the topology process from the child");
                    process.exit(0);
                }, 0);
            });
        }
        catch (e) {
            // stop the process if it was not stopped so far
            log.logger().error(this.log_prefix + `Error while shutting down topology, process id = ${process.pid}`);
            log.logger().exception(e);
            process.exit(1);
        }
    }
    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    sendToParent(cmd, data) {
        if (process.send) {
            process.send({ cmd: cmd, data: data });
        }
        else {
            // we're running in dev/test mode as a standalone process
            console.log(this.log_prefix + "Sending command", { cmd: cmd, data: data });
        }
    }
}
/////////////////////////////////////////////////////////////////////////////////////
// start worker and listen for messages from parent
let wr = new TopologyLocalWrapper();
wr.start();
//# sourceMappingURL=topology_local_wrapper.js.map