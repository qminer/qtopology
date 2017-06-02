import * as intf from "../../topology_interfaces";
export declare class HttpCoordinator implements intf.CoordinationStorage {
    private port;
    private client;
    private urlPrefix;
    constructor(port?: number);
    getMessages(name: string, callback: intf.SimpleResultCallback<intf.StorageResultMessage[]>): void;
    getWorkerStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultWorkerStatus[]>): void;
    getTopologyStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>): void;
    getTopologiesForWorker(name: string, callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>): void;
    getLeadershipStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultStatus>): void;
    registerWorker(name: string, callback: intf.SimpleCallback): void;
    announceLeaderCandidacy(name: string, callback: intf.SimpleCallback): void;
    checkLeaderCandidacy(name: string, callback: intf.SimpleResultCallback<boolean>): void;
    assignTopology(uuid: string, name: string, callback: intf.SimpleCallback): void;
    setTopologyStatus(uuid: string, status: string, error: string, callback: intf.SimpleCallback): void;
    setWorkerStatus(name: string, status: string, callback: intf.SimpleCallback): void;
    registerTopology(uuid: string, config: any, callback: intf.SimpleCallback): void;
    disableTopology(uuid: string, callback: intf.SimpleCallback): void;
    enableTopology(uuid: string, callback: intf.SimpleCallback): void;
    deleteTopology(uuid: string, callback: intf.SimpleCallback): void;
    private call(addr, req_data, callback);
}
