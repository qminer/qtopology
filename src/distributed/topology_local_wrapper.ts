
import * as topology_compiler from "../topology_compiler";
import * as tl from "../topology_local";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
class TopologyLocalWrapper {

    private uuid: string;
    private topology_local: tl.TopologyLocal;
    private waiting_for_shutdown: boolean;

    /** Constructor that sets up call routing */
    constructor() {
        let self = this;
        this.topology_local = new tl.TopologyLocal();
        this.waiting_for_shutdown = false;
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
            log.logger().warn("[Wrapper] Received SIGINT");
            self.shutdown();
        });
    }

    /** Starts infinite loop by reading messages from parent or console */
    start() {
        let self = this;
    }

    /** Internal main handler for incoming messages */
    private handle(msg: intf.ParentMsg) {
        let self = this;
        if (msg.cmd === intf.ParentMsgCode.init) {
            log.logger().important("[Local wrapper] Initializing topology " + msg.data.general.uuid);
            self.uuid = msg.data.general.uuid;
            delete msg.data.general.uuid;
            let compiler = new topology_compiler.TopologyCompiler(msg.data);
            compiler.compile();
            let topology = compiler.getWholeConfig();
            self.topology_local.init(self.uuid, topology, (err) => {
                self.topology_local.run();
                self.sendToParent(intf.ChildMsgCode.response_init, { err: err });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.run) {
            self.topology_local.run();
            self.sendToParent(intf.ChildMsgCode.response_run, {});
        }
        if (msg.cmd === intf.ParentMsgCode.pause) {
            self.topology_local.pause((err) => {
                self.sendToParent(intf.ChildMsgCode.response_pause, { err: err });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.resume) {
            self.topology_local.resume((err) => {
                self.sendToParent(intf.ChildMsgCode.response_resume, { err: err });
            });
        }
        if (msg.cmd === intf.ParentMsgCode.shutdown) {
            self.shutdown();
        }
    }

    /** This method shuts down the local topology */
    private shutdown(msg?: intf.ParentMsg) {
        try {
            let self = this;
            if (self.waiting_for_shutdown) {
                return;
            }
            self.waiting_for_shutdown = true;
            log.logger().important("[Local wrapper] Shutting down topology " + self.uuid);
            self.topology_local.shutdown((err) => {
                // if we are shutting down due to unhandeled exception,
                // we have the original error from the data field of the message
                let msg_data = (msg ? msg.data : null);
                self.sendToParent(intf.ChildMsgCode.response_shutdown, { err: err || msg_data });
                setTimeout(() => {
                    // stop the process if it was not stopped so far
                    log.logger().important("Stopping the topology process from the child");
                    process.exit(0);
                }, 500);
            });
        } catch (e) {
            // stop the process if it was not stopped so far
            log.logger().error("Error while shutting down topology");
            log.logger().exception(e);
            process.exit(1);
        }
    }

    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    private sendToParent(cmd: intf.ChildMsgCode, data: any) {
        if (process.send) {
            process.send({ cmd: cmd, data: data });
        } else {
            // we're running in dev/test mode as a standalone process
            console.log("[Local wrapper] Sending command", { cmd: cmd, data: data });
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////

// start worker and listen for messages from parent
let wr = new TopologyLocalWrapper();
wr.start();
