import * as topology_compiler from "../topology_compiler";
import * as tl from "../topology_local";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as serialize_error from "serialize-error";

/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
export class TopologyLocalWrapper {

    private uuid: string;
    private process: any; // this should be NodeJS.Process, but the four parameter send method is missing in typescript.
    private topology_local: tl.TopologyLocal;
    private waiting_for_shutdown: boolean;
    private log_prefix: string;
    private pingTimeout: number; // milliseconds
    private pingInterval: number; // milliseconds
    private lastPing: number;
    private pingIntervalId: NodeJS.Timer;

    /** Constructor that sets up call routing */
    constructor(proc?: any) {
        this.process = proc || process;
        this.topology_local = null;
        this.waiting_for_shutdown = false;
        this.log_prefix = "[Wrapper] ";
        this.pingTimeout = 20 * 1000;
        this.pingInterval = 3000;
        this.lastPing = Date.now();
        this.process.on("message", msg => {
            this.handle(msg);
        });
        this.process.once("uncaughtException", (e: Error) => {
            log.logger().error(this.log_prefix + "Unhandeled error in topology wrapper");
            log.logger().exception(e);
            this.clearPingInterval();
            this.killProcess(intf.ChildExitCode.unhandeled_error, e);
        });
        this.process.once("SIGINT", () => {
            log.logger().warn(this.log_prefix + "Received SIGINT, this process id = " + this.process.pid);
            if (!this.topology_local) {
                this.exitNonInit("Shutdown", intf.ChildMsgCode.response_shutdown,
                    intf.ChildExitCode.shutdown_notinit_error);
            } else {
                this.shutdown();
            }
        });
        this.process.once("SIGTERM", () => {
            log.logger().warn(this.log_prefix + "Received SIGTERM, this process id = " + this.process.pid);
            if (!this.topology_local) {
                this.exitNonInit("Shutdown", intf.ChildMsgCode.response_shutdown,
                    intf.ChildExitCode.shutdown_notinit_error);
            } else {
                this.shutdown();
            }
        });
        this.setPingInterval();
    }

    /** Starts infinite loop by reading messages from parent or console */
    public start() {
        // no-op
    }

    /** sets ping interval */
    private setPingInterval() {
        this.clearPingInterval();
        this.pingIntervalId = setInterval(
            () => {
                if (!this.process.connected) {
                    this.clearPingInterval();
                    const s = `${this.log_prefix}Connected property in child process (pid=${this.process.pid}) ` +
                        `is false, shutting down topology.`;
                    log.logger().error(s);
                    // Bad state: we cannot know if there isn't some other parent that's running the same topology.
                    // Calling shutdown should be done when we believe the state is OK.
                    this.killProcess(intf.ChildExitCode.parent_disconnect, new Error(s));
                    return;
                }

                const now = Date.now();
                if (now - this.lastPing > this.pingTimeout) {
                    this.clearPingInterval();
                    const s = `${this.log_prefix}Ping inside child process (pid=${this.process.pid}) was ` +
                        `not received from parent in predefined interval, shutting down topology.`;
                    log.logger().error(s);
                    // Bad state: we cannot know if there isn't some other parent that's running the same topology.
                    // Calling shutdown should be done when we believe the state is OK.
                    this.killProcess(intf.ChildExitCode.parent_ping_timeout, new Error(s));
                    return;
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
        this.clearPingInterval();
        const s = `${fun} called in the child process, but the topology hasn't been initialized yet.`;
        log.logger().error(this.log_prefix + s);
        this.sendToParent(msgCode, { err: new Error(s) }, () => {
            this.killProcess(exitCode); // error was already sent to parent
        });

    }

    /** Internal main handler for incoming messages */
    private handle(msg: intf.IParentMsg) {
        if (msg.cmd === intf.ParentMsgCode.init) {
            if (this.topology_local) {
                const s = `Init called in the child process (${msg.data.general.uuid}), but the topology ` +
                    `is already running (${this.topology_local.getUuid()}).`;
                log.logger().error(this.log_prefix + s);
                this.sendToParent(intf.ChildMsgCode.response_init, { err: new Error(s) });
                return;
            }
            this.uuid = msg.data.general.uuid;
            this.log_prefix = `[Wrapper ${this.uuid}] `;
            delete msg.data.general.uuid;
            const compiler = new topology_compiler.TopologyCompiler(msg.data);
            try {
                compiler.compile();
            } catch (err) {
                this.sendToParent(intf.ChildMsgCode.response_init, { err }, () => {
                    this.killProcess(intf.ChildExitCode.init_error); // error was already sent to parent
                });
                return;
            }
            const topology = compiler.getWholeConfig();
            if (topology.general && topology.general.wrapper) {
                this.pingTimeout = topology.general.wrapper.ping_child_timeout || this.pingTimeout;
                this.pingInterval = topology.general.wrapper.ping_child_interval || this.pingInterval;
                this.setPingInterval();
                if (topology.general.wrapper.log_level) {
                    log.logger().setLevel(topology.general.wrapper.log_level);
                }
            }
            log.logger().important(this.log_prefix + "Initializing topology " + this.uuid);
            // if an internal error is raised we will exit with code 110
            this.topology_local = new tl.TopologyLocal(err => {
                this.killProcess(intf.ChildExitCode.internal_error, err);
            });
            this.topology_local.init(this.uuid, topology, err => {
                this.sendToParent(intf.ChildMsgCode.response_init, { err }, () => {
                    if (err) {
                        this.killProcess(intf.ChildExitCode.init_error); // error was already sent to parent
                    }
                });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.ping) {
            this.lastPing = Date.now();
            this.sendToParent(intf.ChildMsgCode.response_ping, {});
        }
        if (msg.cmd === intf.ParentMsgCode.run) {
            if (!this.topology_local) {
                const s = `Run called in the child process, but the topology hasn't been initialized yet.`;
                log.logger().error(this.log_prefix + s);
                this.sendToParent(intf.ChildMsgCode.response_run, { err: new Error(s) });
                return;
            }
            this.topology_local.run((err?: Error) => {
                this.sendToParent(intf.ChildMsgCode.response_run, { err }, () => {
                    if (err) {
                        this.killProcess(intf.ChildExitCode.run_error); // error was already sent to parent
                    }
                });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.pause) {
            if (!this.topology_local) {
                const s = `Pause called in the child process, but the topology hasn't been initialized yet.`;
                log.logger().error(this.log_prefix + s);
                this.sendToParent(intf.ChildMsgCode.response_pause, { err: new Error(s) });
                return;
            }
            this.topology_local.pause((err?: Error) => {
                this.sendToParent(intf.ChildMsgCode.response_pause, { err }, () => {
                    if (err) {
                        this.killProcess(intf.ChildExitCode.pause_error); // error was already sent to parent
                    }
                });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.shutdown) {
            if (!this.topology_local) {
                this.exitNonInit("Shutdown", intf.ChildMsgCode.response_shutdown,
                    intf.ChildExitCode.shutdown_notinit_error);
                return;
            }
            this.shutdown();
        }
    }

    /** Kill this process the hard way. */
    private killProcess(exit_code?: number, err?: Error) {
        this.clearPingInterval();
        if (err) {
            this.sendToParent(intf.ChildMsgCode.error, { err }, e => {
                if (e) {
                    this.process.exit(intf.ChildExitCode.parent_disconnect);
                } else {
                    this.process.exit(exit_code || intf.ChildExitCode.internal_error);
                }
            });
        } else {
            // call hard shut-down anyway
            if (this.topology_local) {
                try {
                    this.topology_local.shutdownHard();
                } catch (e) {
                    log.logger().error(
                        this.log_prefix +
                        `THIS SHOULD NOT HAPPEN. Error while shutdownHard in ` +
                        `topology ${this.uuid}, process id = ${this.process.pid}`);
                    log.logger().exception(e);
                }
            }
            // stop the process after a short while, so that the parent can process the message
            log.logger().important(
                this.log_prefix +
                `Calling process.exit(${exit_code || intf.ChildExitCode.exit_ok}) from the child process ` +
                `for topology ${this.uuid}, process id = ${this.process.pid}`);
            this.process.exit(exit_code || intf.ChildExitCode.exit_ok);
        }
    }

    /** This method shuts down the local topology.
     * Any bolt/spout shutdown exception `err` will be propagated
     * to this method and will result in calling self.killProcess(shutdown_internal_error, err)
     */
    private shutdown() {
        try {
            if (this.waiting_for_shutdown) {
                const s =
                    `Ignoring shutdown in the child process (${this.uuid}): ` +
                    `the topology is already shutting down (${this.topology_local.getUuid()}).`;
                log.logger().warn(this.log_prefix + s);
                // do not send error to parent (topology not in error state)
                return;
            }
            this.clearPingInterval();
            this.waiting_for_shutdown = true;
            log.logger().important(
                this.log_prefix + `Shutting down topology ${this.uuid}, process id = ${this.process.pid}`);
            this.topology_local.shutdown(err => {
                // if we are shutting down due to unrecoverable exception
                // we have the original error from the data field of the message
                this.sendToParent(intf.ChildMsgCode.response_shutdown, { err }, () => {
                    if (err) {
                        log.logger().error(
                            this.log_prefix +
                            `Error shutting down topology ${this.uuid}, process id = ${this.process.pid}`);
                        log.logger().exception(err);
                        // error was already sent to parent
                        this.killProcess(intf.ChildExitCode.shutdown_internal_error);
                        return;
                    }
                    this.killProcess(intf.ChildExitCode.exit_ok);
                });
            });
        } catch (e) {
            // stop the process if it was not stopped so far
            // topology_local shutdown is never expected to throw (propagate errors through callbacks)
            log.logger().error("THIS SHOULD NOT HAPPEN!");
            log.logger().error(
                this.log_prefix + `Error while shutting down topology ${this.uuid}, process id = ${this.process.pid}`);
            log.logger().exception(e);
            this.sendToParent(intf.ChildMsgCode.response_shutdown, { err: e }, () => {
                this.killProcess(intf.ChildExitCode.shutdown_unlikely_error); // error was already sent to parent
            });
        }
    }

    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    private sendToParent(cmd: intf.ChildMsgCode, data: any, callback?: intf.SimpleCallback) {
        if (this.process.send) {
            if (data.err) {
                data.err = serialize_error(data.err);
            }
            if (callback) {
                this.process.send({ cmd, data }, null, {}, callback);
            } else {
                this.process.send({ cmd, data });
            }
        } else {
            // we're running in dev/test mode as a standalone process
            console.log(this.log_prefix + "Sending command", { cmd, data });
            if (callback) { return callback(); }
        }
    }
}
