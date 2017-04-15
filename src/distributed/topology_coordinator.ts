import * as async from "async";
import * as leader from "./topology_leader";
import * as EventEmitter from "events";
import * as intf from "../topology_interfaces";

/** This class handles communication with topology coordination storage.
 */
export class TopologyCoordinator extends EventEmitter {

    _storage: intf.CoordinationStorage;
    _name: string;
    _isRunning: boolean;
    _shutdownCallback: intf.SimpleCallback;
    _loopTimeout: number;
    _leadership: leader.TopologyLeader;

    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage) {
        super();
        this._storage = storage;
        this._name = name;
        this._leadership = new leader.TopologyLeader(this._name, this._storage);
        this._isRunning = false;
        this._shutdownCallback = null;
        this._loopTimeout = 2 * 1000; // 2 seconds for refresh
    }

    /** Runs main loop */
    run() {
        let self = this;
        self._isRunning = true;
        self._storage.registerWorker(self._name, () => { });
        self._leadership.run();
        async.whilst(
            () => {
                return self._isRunning;
            },
            (xcallback) => {
                setTimeout(function () {
                    self._handleIncommingRequests(xcallback);
                }, self._loopTimeout);
            },
            (err) => {
                console.log("Coordinator shutdown finished.");
                if (self._shutdownCallback) {
                    self._shutdownCallback(err);
                }
            }
        );
    }

    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        self.reportWorker(self._name, "dead", "", (err) => {
            if (err) {
                console.log("Error while reporting worker status as 'dead':", err);
            }
            self._leadership.shutdown((err) => {
                if (err) {
                    console.log("Error while shutting down leader:", err);
                }
                console.log("Coordinator set for shutdown");
                self._shutdownCallback = callback;
                self._isRunning = false;
            });
        });
    }

    /** Set status on given topology */
    reportTopology(uuid: string, status: string, error: string, callback?: intf.SimpleCallback) {
        this._storage.setTopologyStatus(uuid, status, error, (err) => {
            if (err) {
                console.log("Couldn't report topology status");
                console.log("Topology:", uuid, status, error);
                console.log("Error:", err);
            }
            if (callback) {
                callback(err);
            }
        });
    }

    /** Set status on given worker */
    reportWorker(name: string, status: string, error: string, callback?: intf.SimpleCallback) {
        this._storage.setWorkerStatus(name, status, (err) => {
            if (err) {
                console.log("Couldn't report worker status");
                console.log("Worker:", name, status);
                console.log("Error:", err);
            }
            if (callback) {
                callback(err);
            }
        });
    }

    /** This method checks for new messages from coordination storage. */
    _handleIncommingRequests(callback: intf.SimpleCallback) {
        let self = this;
        self._storage.getMessages(self._name, (err, msgs) => {
            if (err) return callback(err);
            async.each(
                msgs,
                (msg, xcallback) => {
                    if (msg.cmd === "start") {
                        self.emit("start", msg.content);
                    }
                    if (msg.cmd === "shutdown") {
                        self.emit("shutdown", {});
                    }
                    xcallback();
                },
                callback
            );
        });
    }
}
