"use strict";

/** Base class for topology-node contexts */
class TopologyContextNode {

    /** Creates new instance of node context */
    constructor(child, bindEmit) {
        this._child = child;
        this._name = null;

        this._req_cnt = 0;
        this._pendingAcks = [];

        let self = this;
        // set up default handlers for incomming messages
        this._handlers = {
            init: (data) => {
                self._name = data.name;
                if (bindEmit) {
                    data.onEmit = (data, callback) => {
                        self._req_cnt++;
                        let req_id = self._req_cnt;
                        this._pendingAcks.push({
                            id: req_id,
                            callback: callback
                        });
                        self.send("data", { data: data, id: req_id });
                    };
                }
                self._child.init(self._name, data, (err) => {
                    if (err) {
                        self.send("init_failed", err);
                    } else {
                        self.send("init_completed", {});
                    }
                });
            },
            shutdown: () => {
                self._child.shutdown((err) => {
                    process.exit(0);
                });
            },
            heartbeat: () => {
                self._child.heartbeat();
            },
            run: () => {
                self._child.run();
            },
            pause: () => {
                self._child.heartbeat();
            },
            ack: (data) => {
                for (let i = 0; i < self._pendingAcks.length; i++) {
                    if (self._pendingAcks[i] && self._pendingAcks[i].id == data.id) {
                        let cb = self._pendingAcks[i].callback;
                        self._pendingAcks[i] = null;
                        cb();
                    }
                }
                self._pendingAcks = self._pendingAcks.filter(x => x != null);
            }
        };

        // route incomming messages from parent process to internal 
        process.on('message', (msg) => {
            let cmd = msg.cmd;
            if (cmd) {
                self._handle(cmd, msg.data);
            }
        });
    }

    /** Sends command to parent process.
     * @param {string} cmd - command to send
     * @param {Object} data - data to send
     */
    send(cmd, data) {
        if (process.send) {
            process.send({ cmd: cmd, data: data });
        } else {
            // we're running in dev/test mode as a standalone process
            console.log("Sending command", { cmd: cmd, data: data });
        }
    }

    /** Starts infinite loop by reading messages from parent or console */
    start() {
        let self = this;
        process.openStdin().addListener("data", function (d) {
            try {
                d = d.toString().trim();
                let i = d.indexOf(" ");
                if (i > 0) {
                    self._handle(d.substr(0, i), JSON.parse(d.substr(i)));
                } else {
                    self._handle(d, {});
                }
            } catch (e) {
                console.error(e);
            }
        });
    }

    /** Handles different events
     * @param {string} cmd - command/event name
     * @param {Object} data - content of the command/event
     */
    _handle(cmd, data) {
        if (this._handlers[cmd]) {
            this._handlers[cmd](data);
        }
    }
}

/** Spout context object - handles communication with parent. */
class TopologyContextSpout extends TopologyContextNode {

    /** Creates new instance of spout context */
    constructor(child) {
        super(child, false);

        let self = this;
        self._handlers.next = (data) => {
            self._child.next((err, data) => {
                if (err) {
                    // TODO what do we do here
                    return;
                }
                if (data) {
                    self.send("data", data);
                } else {
                    self.send("empty", {});
                }
            });
        };
    }
}

/** Bolt context object - handles communication with parent. */
class TopologyContextBolt extends TopologyContextNode {

    /** Creates new instance of bolt context */
    constructor(child) {
        super(child, true);

        this._req_cnt = 0;
        this._pending_acks = [];

        let self = this;
        self._handlers.data = (data) => {
            self._child.receive(data, (err) => {
                self.send("ack", err);
            });
        };
    }
}

//////////////////////////////////////////////////////////////////////////////

exports.TopologyContextSpout = TopologyContextSpout;
exports.TopologyContextBolt = TopologyContextBolt;
