
import * as topology_compiler from "../topology_compiler";
import * as tl from "../topology_local";
import * as intf from "../topology_interfaces";

/**
 * This class acts as wrapper for local topology when
 * it is run in child process. It handles communication with parent process.
 */
class TopologyLocalWrapper {

    _topology_local: tl.TopologyLocal;

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
        // process.openStdin().addListener("data", function (d) {
        //     try {
        //         d = d.toString().trim();
        //         let i = d.indexOf(" ");
        //         if (i > 0) {
        //             self._handle(d.substr(0, i), JSON.parse(d.substr(i)));
        //         } else {
        //             self._handle(d, {});
        //         }
        //     } catch (e) {
        //         console.error(e);
        //     }
        // });
    }

    /** Internal main handler for incoming messages */
    _handle(msg: intf.ParentMsg) {
        let self = this;
        if (msg.cmd === "init") {
            let compiler = new topology_compiler.TopologyCompiler(msg.data);
            compiler.compile();
            let topology = compiler.getWholeConfig();
            self._topology_local.init(topology, (err) => {
                self._topology_local.run();
                self._send("response_init", { err: err });
            });
        }
        if (msg.cmd === "run") {
            self._topology_local.run();
            self._send("response_run", {});
        }
        if (msg.cmd === "pause") {
            self._topology_local.pause((err) => {
                self._send("response_pause", { err: err });
            });
        }
        if (msg.cmd === "shutdown") {
            console.log("Shutting down topology", self._topology_local._config.general.name);
            self._topology_local.shutdown((err) => {
                self._send("response_shutdown", { err: err });
                process.exit(0);
            });
        }
    }

    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    _send(cmd: string, data: any) {
        if (process.send) {
            process.send({ cmd: cmd, data: data });
        } else {
            // we're running in dev/test mode as a standalone process
            console.log("Sending command", { cmd: cmd, data: data });
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////

exports.TopologyLocalWrapper = TopologyLocalWrapper;


let wr = new TopologyLocalWrapper();
wr.start();

