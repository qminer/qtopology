import * as path from "path";
import * as fs from "fs";
import * as http from "http";

import * as intf from "../../topology_interfaces";
import * as log from "../../util/logger";
import * as http_server from "../../util/http_server";

//////////////////////////////////////////////////////////////////////

/**
 * List of options for QTopologyDashboard
 */
export interface DashboardServerOptions {
    /** Storage where the data is located */
    storage: intf.CoordinationStorage;
    /** Port number where the stand-alone table should run. Optional. */
    port?: number;
    /** Express application to inject routes into. Optional. */
    app?: any;
    /** Path prefix to use when injecting into Express. Optional */
    prefix?: string;
    /** Page title. Optional */
    title?: string;
    /** Link url to parent page. Optional */
    back_url?: string;
    /** Link text to parent page. Optional */
    back_title?: string;
}

/**
 * Class for handling QTopology dashboard, either as stand-alone web server or
 * via injection into Express application.
 */
export class DashboardServer {

    /** Custom page title. Optional */
    private title?: string;
    /** Link url to parent page. Optional */
    private back_url?: string;
    /** Link text to parent page. Optional */
    private back_title?: string;
    /** Port number where the stand-alone table should run. */
    private port: number;
    /** Storage where the data is located */
    private storage: intf.CoordinationStorage;
    /** Stand-alone web server */
    private server: http_server.MinimalHttpServer;

    /** Simple constructor */
    constructor() {
        this.storage = null;
        this.port = null;
        this.server = null;
        this.back_title = null;
        this.back_url = null;
        this.title = null;
    }

    /** Internal initialization step */
    private initCommon(storage: intf.CoordinationStorage, callback: intf.SimpleCallback) {
        let self = this;
        self.storage = storage;
        self.server = new http_server.MinimalHttpServer("[QTopology Dashboard]");

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
            self.storage.registerTopology(data.uuid, data.config, callback);
        });
        self.server.addHandler("clear-topology-error", (data, callback) => {
            self.storage.clearTopologyError(data.uuid, callback);
        });
        self.server.addHandler("disable-topology", (data, callback) => {
            self.storage.disableTopology(data.uuid, callback);
        });
        self.server.addHandler("pause-topology", (data, callback) => {
            self.storage.pauseTopology(data.uuid, callback);
        });
        self.server.addHandler("resume-topology", (data, callback) => {
            self.storage.resumeTopology(data.uuid, callback);
        });
        self.server.addHandler("enable-topology", (data, callback) => {
            self.storage.enableTopology(data.uuid, callback);
        });
        self.server.addHandler("stop-topology", (data, callback) => {
            self.storage.stopTopology(data.uuid, callback);
        });
        self.server.addHandler("topology-info", (data, callback) => {
            self.storage.getTopologyInfo(data.uuid, callback);
        });
        self.server.addHandler("topology-history", (data, callback) => {
            self.storage.getTopologyHistory(data.uuid, callback);
        });
        self.server.addHandler("worker-history", (data, callback) => {
            self.storage.getWorkerHistory(data.name, callback);
        });
        self.server.addHandler("delete-worker", (data, callback) => {
            self.storage.deleteWorker(data.name, callback);
        });
        self.server.addHandler("shut-down-worker", (data, callback) => {
            self.storage.shutDownWorker(data.name, callback);
        });
        self.server.addHandler("storage-info", (data, callback) => {
            self.storage.getProperties((err, props) => {
                callback(err, { data: props });
            });
        });
        self.server.addHandler("display-data", (data, callback) => {
            callback(null, {
                back_url: this.back_url,
                back_title: this.back_title,
                title: this.title
            });
        });
        callback();
    }

    /**
     * The most flexible initialization method
     * @param options - object containing options for dashboard
     * @param callback - standard callback
     */
    initComplex(options: DashboardServerOptions, callback: intf.SimpleCallback) {
        let self = this;
        self.port = options.port;
        self.back_title = options.back_title;
        self.back_url = options.back_url;
        self.title = options.title;
        self.initCommon(options.storage, (err) => {
            if (err) return callback(err);
            if (options.app) {
                let app = options.app;
                let prefix = options.prefix;
                let prepareAddr = (url) => {
                    return url.replace(`/${prefix}`, "");
                };

                app.get(`/${prefix}`, (req, res) => {
                    res.redirect(`/${prefix}/qtopology_dashboard.html`);
                });
                app.get(`/${prefix}/*`, (req, res) => {
                    self.handle(req.method, prepareAddr(req.url), req.body, res);
                });
                app.post(`/${prefix}/*`, (req, res) => {
                    self.handle(req.method, prepareAddr(req.url), req.body, res);
                });
            }
            callback();
        });
    }

    /**
     * Simple method for initialization as stand-alone server
     * @param port - Port where stand-alone table should run
     * @param storage - Storage object
     * @param callback - Standard callback
     */
    init(port: number, storage: intf.CoordinationStorage, callback: intf.SimpleCallback) {
        this.initComplex({ port: port, storage: storage }, callback);
    }

    /**
     * Simple method for injection into Express application
     * @param app - Express application where routes should be injected
     * @param prefix - Injection prefix
     * @param storage - Storage object
     * @param callback - Standard callback
     */
    initForExpress(app: any, prefix: string, storage: intf.CoordinationStorage, callback: intf.SimpleCallback) {
        let self = this;
        self.initComplex({ app: app, prefix: prefix, storage: storage }, (err) => {
            if (err) return callback(err);

            let prepareAddr = (url) => {
                return url.replace(`/${prefix}`, "");
            };

            app.get(`/${prefix}`, (req, res) => {
                res.redirect(`/${prefix}/qtopology_dashboard.html`);
            });
            app.get(`/${prefix}/*`, (req, res) => {
                self.handle(req.method, prepareAddr(req.url), req.body, res);
            });
            app.post(`/${prefix}/*`, (req, res) => {
                self.handle(req.method, prepareAddr(req.url), req.body, res);
            });
            callback();
        });
    }

    /** Runs the stand-alone server */
    run() {
        this.server.run(this.port);
    }

    /** Handles requests */
    handle(method: string, addr: string, body: any, resp: http.ServerResponse) {
        this.server.handle(method, addr, body, resp);
    }
}
