"use strict";

"use strict";

const async = require("async");
const EventEmitter = require("events");
const leader = require("./topology_leader");

/** This class handles communication with topology coordination storage.
 */
class TopologyCoordinator extends EventEmitter {

    /** Simple constructor */
    constructor(options) {
        super();
        this._storage = options.storage;
        this._name = options.name;
        this._leadership = new leader.TopologyLeader({
            storage: this._storage,
            name: this._name
        });
        this._isRunning = false;
        this._shutdownCallback = null;
        this._loopTimeout = 2 * 1000; // 2 seconds for refresh
    }

    /** Runs main loop */
    run() {
        let self = this;
        self._isRunning = true;
        self._storage.registerWorker(self._name, () => { });
        async.whilst(
            () => { return self._isRunning; },
            (xcallback) => {
                setTimeout(function () {
                    self._handleIncommingRequests(xcallback);
                }, self._loopTimeout);
            },
            (err) => {
                if (self._shutdownCallback) {
                    self._shutdownCallback(err);
                }
            }
        );
    }

    /** Shut down the loop */
    shutdown(callback) {
        let self = this;
        self._leadership.shutdown(() => {
            self._shutdownCallback = callback;
            self._isRunning = false;
        });
    }

    /** This method checks for new messages from coordination storage. */
    _handleIncommingRequests(callback) {
        let self = this;
        self._storage.getMessages(self._name, (err, msgs) => {
            if (err) return callback(err);
            async.each(
                msgs,
                (msg, xcallback) => {
                    if (msg.cmd === "start") {
                        self.emit("start", msg.data);
                    }
                    if (msg.cmd === "shutdown") {
                        self.emit("shutdown", {});
                    }
                },
                callback
            );
        });
    }
}
