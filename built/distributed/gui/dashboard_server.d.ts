/// <reference types="node" />
import * as http from "http";
import * as intf from "../../topology_interfaces";
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
    /** Custom properties to present in GUI */
    custom_props?: intf.StorageProperty[];
}
/**
 * Class for handling QTopology dashboard, either as stand-alone web server or
 * via injection into Express application.
 */
export declare class DashboardServer {
    /** Custom page title. Optional */
    private title?;
    /** Link url to parent page. Optional */
    private back_url?;
    /** Link text to parent page. Optional */
    private back_title?;
    /** Port number where the stand-alone table should run. */
    private port;
    /** Storage where the data is located */
    private storage;
    /** Stand-alone web server */
    private server;
    /** Custom properties to present in GUI */
    custom_props: intf.StorageProperty[];
    /** Simple constructor */
    constructor();
    /** Internal initialization step */
    private initCommon(storage, callback);
    /**
     * The most flexible initialization method
     * @param options - object containing options for dashboard
     * @param callback - standard callback
     */
    initComplex(options: DashboardServerOptions, callback: intf.SimpleCallback): void;
    /**
     * Simple method for initialization as stand-alone server
     * @param port - Port where stand-alone table should run
     * @param storage - Storage object
     * @param callback - Standard callback
     */
    init(port: number, storage: intf.CoordinationStorage, callback: intf.SimpleCallback): void;
    /**
     * Simple method for injection into Express application
     * @param app - Express application where routes should be injected
     * @param prefix - Injection prefix
     * @param storage - Storage object
     * @param callback - Standard callback
     */
    initForExpress(app: any, prefix: string, storage: intf.CoordinationStorage, callback: intf.SimpleCallback): void;
    /** Runs the stand-alone server */
    run(): void;
    /** Handles requests */
    handle(method: string, addr: string, body: any, resp: http.ServerResponse): void;
}
