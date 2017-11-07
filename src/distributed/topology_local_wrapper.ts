import * as topology_compiler from "../topology_compiler";
import * as tl from "../topology_local";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as serialize_error from "serialize-error"

/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
export class TopologyLocalWrapper {

    private uuid: string;
    private process: NodeJS.Process;
    private topology_local: tl.TopologyLocal;
    private waiting_for_shutdown: boolean;
    private log_prefix: string;
    private exitTimeout: number; // milliseconds
    private pingTimeout: number; // milliseconds
    private pingInterval: number; // milliseconds
    private lastPing: number;
    private pingIntervalId: NodeJS.Timer;

    /** Constructor that sets up call routing */
    constructor(proc?: any) {
        let self = this;
        this.process = proc || process;
        this.topology_local = null;
        this.waiting_for_shutdown = false;
        this.lastPing = Date.now();
        this.log_prefix = "[Wrapper] ";
        this.exitTimeout = 100;
        this.pingTimeout = 20 * 1000;
        this.pingInterval = 3000;
        this.process.on("message", (msg) => {
            self.handle(msg);
        });
        this.process.on("uncaughtException", (e: Error) => {
            log.logger().error(self.log_prefix + "Unhandeled error in topology wrapper: " + e);
            log.logger().exception(e);
            self.clearPingInterval();
            self.killProcess(intf.ChildExitCode.unhandeled_error, e);
        });
        this.process.on('SIGINT', () => {
            log.logger().warn(self.log_prefix + "Received SIGINT, this process id = " + self.process.pid);
            if (!self.topology_local) {
                self.exitNonInit("Shutdown", intf.ChildMsgCode.response_shutdown,
                    intf.ChildExitCode.shutdown_notinit_error);
            } else {
                self.shutdown();
            }
        });
        this.process.on('SIGTERM', () => {
            log.logger().warn(self.log_prefix + "Received SIGTERM, this process id = " + self.process.pid);
            if (!self.topology_local) {
                self.exitNonInit("Shutdown", intf.ChildMsgCode.response_shutdown,
                    intf.ChildExitCode.shutdown_notinit_error);
            } else {
                self.shutdown();
            }
        });
        this.setPingInterval();
    }

    /** sets ping interval */
    private setPingInterval() {
        let self = this;
        this.clearPingInterval();
        this.pingIntervalId = setInterval(
            () => {
                if (!self.process.connected) {
                    self.clearPingInterval();
                    let s = `${self.log_prefix}Connected property in child process (pid=${self.process.pid}) is false, shutting down topology.`;
                    log.logger().error(s);
                    // Bad state: we cannot know if there isn't some other parent that's running the same topology.
                    // Calling shutdown should be done when we believe the state is OK.
                    self.killProcess(intf.ChildExitCode.parent_disconnect, new Error(s));
                    return;
                }

                let now = Date.now();
                if (now - this.lastPing > this.pingTimeout) {
                    self.clearPingInterval();
                    let s = `${self.log_prefix}Ping inside child process (pid=${self.process.pid}) was not received from parent in predefined interval, shutting down topology.`;
                    log.logger().error(s);
                    // Bad state: we cannot know if there isn't some other parent that's running the same topology.
                    // Calling shutdown should be done when we believe the state is OK.
                    self.killProcess(intf.ChildExitCode.parent_ping_timeout, new Error(s));
                    return
                }
            },
            this.pingInterval
        );
    }

    /** clears ping interval */
    private clearPingInterval() {
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
    }

    /** exit logic when not initialized */
    private exitNonInit(fun: string, msgCode: intf.ChildMsgCode, exitCode: intf.ChildExitCode) {
        let self = this;
        self.clearPingInterval();
        let s = `${fun} called in the child process, but the topology hasn't been initialized yet.`;
        log.logger().error(self.log_prefix + s);
        self.sendToParent(msgCode, { err: new Error(s) });
        self.killProcess(exitCode); // error was already sent to parent
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
            self.log_prefix = `[Wrapper ${self.uuid}] `;
            delete msg.data.general.uuid;
            let compiler = new topology_compiler.TopologyCompiler(msg.data);
            try {
                compiler.compile();
            } catch (err) {
                self.sendToParent(intf.ChildMsgCode.response_init, { err: err });
                self.killProcess(intf.ChildExitCode.init_error); // error was already sent to parent
                return;
            }
            let topology = compiler.getWholeConfig();
            // if an internal error is raised we will exit with code 110
            self.topology_local = new tl.TopologyLocal((err) => { self.killProcess(intf.ChildExitCode.internal_error, err); });
            self.topology_local.init(self.uuid, topology, (err) => {
                self.sendToParent(intf.ChildMsgCode.response_init, { err: err });
                if (err) {
                    self.killProcess(intf.ChildExitCode.init_error); // error was already sent to parent
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
                    self.killProcess(intf.ChildExitCode.run_error); // error was already sent to parent
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
                    self.killProcess(intf.ChildExitCode.pause_error); // error was already sent to parent
                }
            });
        }
        if (msg.cmd === intf.ParentMsgCode.shutdown) {
            if (!self.topology_local) {
                self.exitNonInit("Shutdown", intf.ChildMsgCode.response_shutdown,
                    intf.ChildExitCode.shutdown_notinit_error);
                return;
            }
            self.shutdown();
        }
    }

    /** Kill this process the hard way. */
    private killProcess(exit_code?: number, err?: Error) {
        let self = this;
        self.clearPingInterval();
        if (err) {
            self.sendToParent(intf.ChildMsgCode.error, { err: err });
        }
        // call hard shut-down anyway
        if (this.topology_local) {
            try {
                this.topology_local.shutdownHard();
            } catch (e) {
                log.logger().error(this.log_prefix + `THIS SHOULD NOT HAPPEN. Error while shutdownHard in topology ${self.uuid}, process id = ${self.process.pid}`);
                log.logger().exception(e);
            }
        }
        // stop the process after a short while, so that the parent can process the message
        setTimeout(() => {
            log.logger().important(self.log_prefix + `Calling process.exit(${exit_code || intf.ChildExitCode.exit_ok}) from the child process for topology ${self.uuid}, process id = ${self.process.pid}`);
            self.process.exit(exit_code || intf.ChildExitCode.exit_ok);
        }, self.exitTimeout);
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
            self.clearPingInterval();
            self.waiting_for_shutdown = true;
            log.logger().important(self.log_prefix + `Shutting down topology ${self.uuid}, process id = ${self.process.pid}`);
            self.topology_local.shutdown((err) => {
                // if we are shutting down due to unrecoverable exception
                // we have the original error from the data field of the message
                self.sendToParent(intf.ChildMsgCode.response_shutdown, { err: err });
                if (err) {
                    log.logger().error(self.log_prefix + `Error shutting down topology ${self.uuid}, process id = ${self.process.pid}`);
                    log.logger().exception(err);
                    self.killProcess(intf.ChildExitCode.shutdown_internal_error); // error was already sent to parent
                    return;
                }
                self.killProcess(intf.ChildExitCode.exit_ok);
                return;
            });
        } catch (e) {
            // stop the process if it was not stopped so far
            log.logger().error("THIS SHOULD NOT HAPPEN!"); // topology_local shutdown is never expected to throw (propagate errors through callbacks)
            log.logger().error(this.log_prefix + `Error while shutting down topology ${self.uuid}, process id = ${self.process.pid}`);
            log.logger().exception(e);
            self.sendToParent(intf.ChildMsgCode.response_shutdown, { err: e });
            self.killProcess(intf.ChildExitCode.shutdown_unlikely_error); // error was already sent to parent
            return;
        }
    }

    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    private sendToParent(cmd: intf.ChildMsgCode, data: any) {
        if (this.process.send) {
            if (data.err) {
                data.err = serialize_error(data.err);
            }
            this.process.send({ cmd: cmd, data: data });
        } else {
            // we're running in dev/test mode as a standalone process
            console.log(this.log_prefix + "Sending command", { cmd: cmd, data: data });
        }
    }
}