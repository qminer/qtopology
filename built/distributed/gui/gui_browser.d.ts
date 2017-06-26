import * as intf from "../../topology_interfaces";
export declare class GuiBrowserHandler implements intf.CoordinationStorageBrowser {
    private storage;
    private client_side_code;
    constructor();
    init(storage: intf.CoordinationStorage, callback: intf.SimpleCallback): void;
    getFile(name: string, callback: intf.SimpleResultCallback<string>): void;
    getWorkerStatus(callback: intf.SimpleResultCallback<string>): void;
    getTopologyStatus(callback: intf.SimpleResultCallback<string>): void;
    postRegisterTopology(config: any, overwrite: boolean, callback: intf.SimpleCallback): void;
    postDisableTopology(uuid: string, callback: intf.SimpleCallback): void;
    postEnableTopology(uuid: string, callback: intf.SimpleCallback): void;
    postDeleteTopology(uuid: string, callback: intf.SimpleCallback): void;
}
