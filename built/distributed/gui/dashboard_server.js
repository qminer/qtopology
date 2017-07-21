"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const http_server = require("../../util/http_server");
//////////////////////////////////////////////////////////////////////
class DashboardServer {
    constructor() {
        this.storage = null;
        this.port = null;
        this.server = null;
    }
    init(port, storage, callback) {
        let self = this;
        self.port = port;
        self.storage = storage;
        self.server = new http_server.MinimalHttpServer();
        // first register static files
        let static_dir = path.join(__dirname, "../../../resources/gui/");
        static_dir = path.resolve(static_dir);
        self.server.addDirectory(static_dir);
        self.server.addRoute("/", path.join(static_dir, "qtopology_dashboard.html"));
        // now add REST handlers
        self.server.addHandler("worker-status", (data, callback) => {
            self.storage.getWorkerStatus(callback);
        });
        self.server.addHandler("topology-status", (data, callback) => {
            self.storage.getTopologyStatus(callback);
        });
        self.server.addHandler("register-topology", (data, callback) => {
            self.storage.registerTopology(data.uuid, data.config, (err) => {
                callback(err, {});
            });
        });
        self.server.addHandler("disable-topology", (data, callback) => {
            self.storage.disableTopology(data.uuid, (err) => {
                callback(err, {});
            });
        });
        self.server.addHandler("enable-topology", (data, callback) => {
            self.storage.enableTopology(data.uuid, (err) => {
                callback(err, {});
            });
        });
        self.server.addHandler("storage-info", (data, callback) => {
            self.storage.getProperties((err, props) => {
                callback(err, { data: props });
            });
        });
        callback();
    }
    run() {
        this.server.run(this.port);
    }
}
exports.DashboardServer = DashboardServer;
//# sourceMappingURL=dashboard_server.js.map