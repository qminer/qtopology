import * as topology_compiler from "../topology_compiler";
import * as tl from "../topology_local";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as serialize_error from "serialize-error"

/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
class TopologyLocalWrapper {

    private uuid: string;
    private topology_local: tl.TopologyLocal;
    private waiting_for_shutdown: boolean;
    private log_prefix: string;
    private lastPing: number;
    private pingIntervalId: NodeJS.Timer;

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
        process.on("uncaughtException", (e: Error) => {
            log.logger().error(self.log_prefix + "Unhandeled error in topology wrapper: " + e);
            log.logger().exception(e);
            self.killProcess(intf.ChildExitCode.unhandeled_error, e);
        });
        process.on('SIGINT', () => {
            log.logger().warn(self.log_prefix + "Received SIGINT, this process id = " + process.pid);
            self.shutdown();
        });
        process.on('SIGTERM', () => {
            log.logger().warn(self.log_prefix + "Received SIGTERM, this process id = " + process.pid);
            self.shutdown();
        });

        this.pingIntervalId = setInterval(
            () => {
                if (!process.connected) {
                    let s = `${self.log_prefix}Connected property in child process (pid=${process.pid}) is false, shutting down topology.`;
                    log.logger().error(s);
                    // Bad state: we cannot know if there isn't some other parent that's running the same topology.
                    // Calling shutdown should be done when we believe the state is OK.
                    self.killProcess(intf.ChildExitCode.parent_disconnect, new Error(s));
                    return;
                }

                let now = Date.now();
                if (now - this.lastPing > 20 * 1000) {
                    let s = `${self.log_prefix}Ping inside child process (pid=${process.pid}) was not received from parent in predefined interval, shutting down topology.`;
                    log.logger().error(s);
                    // Bad state: we cannot know if there isn't some other parent that's running the same topology.
                    // Calling shutdown should be done when we believe the state is OK.
                    self.killProcess(intf.ChildExitCode.parent_ping_timeout, new Error(s));
                    return
                }
            },
            3000
        );
    }

    /** Starts infinite loop by reading messages from parent or console */
    start() {
        //let self = this;
    }

    /** Internal main handler for incoming messages */
    private handle(msg: intf.ParentMsg) {
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
            self.log_prefix = `[Wrapper ${self.uuid}]`;
            delete msg.data.general.uuid;
            let compiler = new topology_compiler.TopologyCompiler(msg.data);
            compiler.compile();
            let topology = compiler.getWholeConfig();
            // if an internal error is raised we will exit with code 110
            self.topology_local = new tl.TopologyLocal((err) => { self.killProcess(intf.ChildExitCode.internal_error, err); });
            self.topology_local.init(self.uuid, topology, (err) => {
                self.sendToParent(intf.ChildMsgCode.response_init, { err: err });
                if (err) {
                    self.killProcess(intf.ChildExitCode.init_error, err);
                }
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
            self.topology_local.run((err?: Error) => {
                self.sendToParent(intf.ChildMsgCode.response_run, { err: err });
                if (err) {
                    self.killProcess(intf.ChildExitCode.run_error, err);
                }
            });
        }
        if (msg.cmd === intf.ParentMsgCode.pause) {
            if (!self.topology_local) {
                let s = `Pause called in the child process, but the topology hasn't been initialized yet.`;
                log.logger().error(self.log_prefix + s);
                self.sendToParent(intf.ChildMsgCode.response_pause, { err: new Error(s) });
                return;
            }
            self.topology_local.pause((err?: Error) => {
                self.sendToParent(intf.ChildMsgCode.response_pause, { err: err });
                if (err) {
                    self.killProcess(intf.ChildExitCode.pause_error, err);
                }
            });
        }
        if (msg.cmd === intf.ParentMsgCode.shutdown) {
            if (!self.topology_local) {
                let s = `Shutdown called in the child process, but the topology hasn't been initialized yet.`;
                log.logger().error(self.log_prefix + s);
                self.sendToParent(intf.ChildMsgCode.response_shutdown, { err: new Error(s) });
                self.killProcess(intf.ChildExitCode.shutdown_notinit_error, new Error(s));
                return;
            }
            self.shutdown();
        }
    }

    /** Kill this process the hard way. */
    private killProcess(exit_code?: number, err?: Error) {
        let self = this;
        if (err) {
            self.sendToParent(intf.ChildMsgCode.error, { err: err });
        }
        // call hard shut-down anyway
        this.topology_local.shutdownHard();
        // stop the process after a short while, so that the parent can process the message
        setTimeout(() => {
            log.logger().important(self.log_prefix + `Calling process.exit(${exit_code || intf.ChildExitCode.exit_ok}) from the child process for topology ${self.uuid}, process id = ${process.pid}`);
            process.exit(exit_code || intf.ChildExitCode.exit_ok);
        }, 100);
    }

    /** This method shuts down the local topology.
     * Any bolt/spout shutdown exception `err` will be propagated
     * to this method and will result in calling self.killProcess(shutdown_internal_error, err)
     */
    private shutdown() {
        let self = this;
        try {
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
                // if we are shutting down due to unrecoverable exception
                // we have the original error from the data field of the message
                self.sendToParent(intf.ChildMsgCode.response_shutdown, { err: err });
                if (err) {
                    log.logger().error(self.log_prefix + `Error shutting down topology ${self.uuid}, process id = ${process.pid}`);
                    log.logger().exception(err);
                    self.killProcess(intf.ChildExitCode.shutdown_internal_error, err);
                    return;
                }
                log.logger().important(self.log_prefix + `Calling process.exit(0) from the child process for topology ${self.uuid}, process id = ${process.pid}`);
                self.killProcess(intf.ChildExitCode.exit_ok, null);
                return;
            });
        } catch (e) {
            // stop the process if it was not stopped so far
            log.logger().error("THIS SHOULD NOT HAPPEN!"); // topology_local shutdown is never expected to throw (propagate errors through callbacks)
            log.logger().error(this.log_prefix + `Error while shutting down topology ${self.uuid}, process id = ${process.pid}`);
            log.logger().exception(e);
            self.sendToParent(intf.ChildMsgCode.response_shutdown, { err: e });
            self.killProcess(intf.ChildExitCode.shutdown_unlikely_error, e);
            return;
        }
    }

    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    private sendToParent(cmd: intf.ChildMsgCode, data: any) {
        if (process.send) {
            if (data.err) {
                data.err = serialize_error(data.err);
            }
            process.send({ cmd: cmd, data: data });
        } else {
            // we're running in dev/test mode as a standalone process
            console.log(this.log_prefix + "Sending command", { cmd: cmd, data: data });
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////

// start worker and listen for messages from parent
let wr = new TopologyLocalWrapper();
wr.start();
