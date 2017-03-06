"use strict";

const EventEmitter = require("events");

/** Topology context in child process - should be instantiated in child process
 * to handle communication with local topology. */
class TopologyContext extends EventEmitter {

    /** Constructor that establishes callbacks for possible parent-process requests.
     */
    constructor() {
        super();
        this._allowed_cmds = ["shutdown", "heartbeat", "init", "run", "pause"];
        this._send = process.send || ((obj) => { console.log(obj); });
        this._name = null;
        let self = this;
        process.on('message', (msg) => {
            try {
                let cmd = msg.cmd;
                if (cmd) {
                    if (cmd == "init"){
                        this._name = msg.name;
                    }
                    self.emit(cmd, msg.data);
                }
            } catch (e) {
                console.log('Exception while processing message from parent:', e);
            }
        });
    }

    /** Sends a message to the parent.
     * @param {string} cmd - command to execute
     * @param {Object} data - the message content
     */
    _sendInternal(cmd, data) {
        //this._send({ cmd: cmd, data: data });
        process.send({ cmd: cmd, data: data });
    }

    /** Method for sending "data" message to parent
     * @param {*} data - data object to send
     */
    sendData(data) {
        this._sendInternal("data", data);
    }

    /** Sends init completed event to parent */
    sendInitCompleted() {
        this._sendInternal("init_completed", {});
    }

    /** Starts infinite loop by reading messages from parent or console */
    start() {
        let self = this;
        process.openStdin().addListener("data", function (d) {
            try {
                d = d.toString().trim();
                let i = d.indexOf(" ");
                if (i > 0) {
                    self.emit(d.substr(0, i), JSON.parse(d.substr(i)));
                } else {
                    self.emit(d);
                }
            } catch (e) {
                console.error(e);
            }
        });
    }
}

/** Spout context */
class TopologyContextSpout extends TopologyContext {

    /** Constructor for spout. */
    constructor() {
        super();
        this._allowed_cmds.push("next");
    }

    /** Method for sending "empty" message to parent. */
    sendEmpty() {
        this._sendInternal("empty", {});
    }
}

/** Bolt context */
class TopologyContextBolt extends TopologyContext {

    /** Constructor for bolt. */
    constructor() {
        super();
        this._allowed_cmds.push("data");
    }
}

//////////////////////////////////////////////////////////////////////////////

exports.TopologyContextSpout = TopologyContextSpout;
exports.TopologyContextBolt = TopologyContextBolt;
