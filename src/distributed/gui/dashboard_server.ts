import * as path from "path";
import * as fs from "fs";

import * as intf from "../../topology_interfaces";
import * as log from "../../util/logger";
import * as http_server from "../../util/http_server";

//////////////////////////////////////////////////////////////////////

export class DashboardServer {

    private port: number;
    private storage: intf.CoordinationStorage;
    private server: http_server.MinimalHttpServer;

    constructor() { }

    init(port: number, storage: intf.CoordinationStorage, callback: intf.SimpleCallback) {
        this.storage = storage;
        this.port = port;
        this.server = null;
        callback();
    }

    getFile(name: string, callback: intf.SimpleResultCallback<string>) {
        let self = this;
        this.server = new http_server.MinimalHttpServer();

        this.server.addRoute("dashboard.html", path.join(__dirname, "../../../resources/gui/qtopology_dashboard.html"));
        this.server.addRoute("dashboard.js", path.join(__dirname, "../../../resources/gui/qtopology_dashboard.js"));

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
