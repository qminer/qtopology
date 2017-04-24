import * as async from "async";
import * as leader from "./topology_leader";
import * as EventEmitter from "events";
import * as intf from "../topology_interfaces";

/** This class handles communication with topology coordination storage.
 */
export class TopologyCoordinator extends EventEmitter {

    private storage: intf.CoordinationStorage;
    private name: string;
    private isRunning: boolean;
    private shutdownCallback: intf.SimpleCallback;
    private loopTimeout: number;
    private leadership: leader.TopologyLeader;

    /** Simple constructor */
    constructor(name: string, storage: intf.CoordinationStorage) {
        super();
        this.storage = storage;
        this.name = name;
        this.leadership = new leader.TopologyLeader(this.name, this.storage);
        this.isRunning = false;
        this.shutdownCallback = null;
        this.loopTimeout = 2 * 1000; // 2 seconds for refresh
    }

    /** Runs main loop */
    run() {
        let self = this;
        self.isRunning = true;
        self.storage.registerWorker(self.name, () => { });
        self.leadership.run();
        async.whilst(
            () => {
                return self.isRunning;
            },
            (xcallback) => {
                setTimeout(function () {
                    self.handleIncommingRequests(xcallback);
                }, self.loopTimeout);
            },
            (err) => {
                console.log("[Coordinator] Coordinator shutdown finished.");
                if (self.shutdownCallback) {
                    self.shutdownCallback(err);
                }
            }
        );
    }

    /** Shut down the loop */
    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        self.reportWorker(self.name, "dead", "", (err) => {
            if (err) {
                console.log("Error while reporting worker status as 'dead':", err);
            }
            self.leadership.shutdown((err) => {
                if (err) {
                    console.log("Error while shutting down leader:", err);
                }
                console.log("[Coordinator] Coordinator set for shutdown");
                self.shutdownCallback = callback;
                self.isRunning = false;
            });
        });
    }

    /** Set status on given topology */
    reportTopology(uuid: string, status: string, error: string, callback?: intf.SimpleCallback) {
        this.storage.setTopologyStatus(uuid, status, error, (err) => {
            if (err) {
                console.log("[Coordinator] Couldn't report topology status");
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
        this.storage.setWorkerStatus(name, status, (err) => {
            if (err) {
                console.log("[Coordinator] Couldn't report worker status");
                console.log("Worker:", name, status);
                console.log("Error:", err);
            }
            if (callback) {
                callback(err);
            }
        });
    }

    /** This method checks for new messages from coordination storage. */
    private handleIncommingRequests(callback: intf.SimpleCallback) {
        let self = this;
        self.storage.getMessages(self.name, (err, msgs) => {
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
