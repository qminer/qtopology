"use strict";

/** Base class for topology-node contexts */
class TopologyContextNode {

    /** Creates new instance of node context */
    constructor(child, bindEmit) {
        super();
        this._child = child;
        this._name = null;

        let self = this;
        process.on('message', (msg) => {
            let cmd = msg.cmd;
            if (cmd) {
                if (cmd == "init") {
                    self._name = msg.data.name;
                    if (bindEmit) {
                        msg.data.init.onEmit = (data) => {
                            self.send("data", data);
                        };
                    }
                    self._child.init(self._name, msg.data.init, (err) => {
                        if (err) {
                            self.send("init_failed", err);
                        } else {
                            self.send("init_completed", {});
                        }
                    });
                } else if ("shutdown") {
                    self._child.shutdown((err) => {
                        process.exit(0);
                    });
                } else if ("heartbeat") {
                    self._child.heartbeat();
                } else if ("run") {
                    self._child.run();
                } else if ("pause") {
                    self._child.heartbeat();
                }
            }
        });
    }

    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    send(cmd, data) {
        process.send({ cmd: cmd, data: data });
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

/** Spout context object - handles communication with parent. */
class TopologyContextSpout extends TopologyContextNode {

    /** Creates new instance of spout context */
    constructor(child) {
        super(child, false);
        let self = this;
        process.on('message', (msg) => {
            let cmd = msg.cmd;
            if (cmd == "next") {
                self._child.next((err, data) => {
                    if (err) {
                        // TODO what do we do here
                        return;
                    }
                    if (data) {
                        self.send("data", err);
                    } else {
                        self.send("empty", err);
                    }
                });
            }
        });
    }
}

/** Bolt context object - handles communication with parent. */
class TopologyContextBolt extends TopologyContextNode {

    /** Creates new instance of bolt context */
    constructor(child) {
        super(child, true);
        let self = this;
        process.on('message', (msg) => {
            let cmd = msg.cmd;
            if (cmd == "data") {
                self._child.receive(msg.data, (err) => {
                    self.send("ack", err);
                });
            }
        });
    }
}

//////////////////////////////////////////////////////////////////////////////

exports.TopologyContextSpout = TopologyContextSpout;
exports.TopologyContextBolt = TopologyContextBolt;
