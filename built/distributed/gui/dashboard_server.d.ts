import * as intf from "../../topology_interfaces";
export declare class DashboardServer {
    private port;
    private storage;
    private server;
    constructor();
    init(port: number, storage: intf.CoordinationStorage, callback: intf.SimpleCallback): void;
    getFile(name: string, callback: intf.SimpleResultCallback<string>): void;
}
