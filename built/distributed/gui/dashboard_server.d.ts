/// <reference types="node" />
import * as http from "http";
import * as intf from "../../topology_interfaces";
export declare class DashboardServer {
    private port;
    private storage;
    private server;
    constructor();
    private initCommon(storage, callback);
    init(port: number, storage: intf.CoordinationStorage, callback: intf.SimpleCallback): void;
    initForExpress(app: any, prefix: string, storage: intf.CoordinationStorage, callback: intf.SimpleCallback): void;
    run(): void;
    handle(method: string, addr: string, body: any, resp: http.ServerResponse): void;
}
