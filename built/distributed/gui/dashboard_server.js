"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_server = require("../../util/http_server");
//////////////////////////////////////////////////////////////////////
class DashboardServer {
    constructor() { }
    init(port, storage, callback) {
        this.storage = storage;
        this.port = port;
        this.server = null;
        callback();
    }
    getFile(name, callback) {
        let self = this;
        this.server = new http_server.MinimalHttpServer();
        this.server.addHandler("worker-status", (data, callback) => {
            self.storage.getWorkerStatus(callback);
        });
        this.server.addHandler("topology-status", (data, callback) => {
            self.storage.getTopologyStatus(callback);
        });
        this.server.addHandler("register-topology", (data, callback) => {
            self.storage.registerTopology(data.uuid, data.config, (err) => {
                callback(err, {});
            });
        });
        this.server.addHandler("disable-topology", (data, callback) => {
            self.storage.disableTopology(data.uuid, (err) => {
                callback(err, {});
            });
        });
        this.server.addHandler("enable-topology", (data, callback) => {
            self.storage.enableTopology(data.uuid, (err) => {
                callback(err, {});
            });
        });
        this.server.run(this.port);
    }
}
exports.DashboardServer = DashboardServer;
//# sourceMappingURL=dashboard_server.js.map