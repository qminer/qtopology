import * as intf from "../../topology_interfaces";
export declare class MemoryCoordinator implements intf.CoordinationStorage {
    private workers;
    private topologies;
    private messages;
    constructor();
    getProperties(callback: intf.SimpleResultCallback<intf.StorageProperty[]>): void;
    getLeadershipStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultStatus>): void;
    getWorkerStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultWorkerStatus[]>): void;
    getTopologyStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>): void;
    getTopologiesForWorker(worker: string, callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>): void;
    getMessages(name: string, callback: intf.SimpleResultCallback<intf.StorageResultMessage[]>): void;
    getTopologyDefinition(uuid: string, callback: intf.SimpleResultCallback<intf.TopologyDefinitionResponse>): void;
    registerWorker(name: string, callback: intf.SimpleCallback): void;
    announceLeaderCandidacy(name: string, callback: intf.SimpleCallback): void;
    checkLeaderCandidacy(name: string, callback: intf.SimpleResultCallback<boolean>): void;
    assignTopology(uuid: string, worker: string, callback: intf.SimpleCallback): void;
    sendMessageToWorker(worker: string, cmd: string, content: any, callback: intf.SimpleCallback): void;
    setTopologyStatus(uuid: string, status: string, error: string, callback: intf.SimpleCallback): void;
    setWorkerStatus(worker: string, status: string, callback: intf.SimpleCallback): void;
    registerTopology(uuid: string, config: intf.TopologyDefinition, callback: intf.SimpleCallback): void;
    disableTopology(uuid: string, callback: intf.SimpleCallback): void;
    enableTopology(uuid: string, callback: intf.SimpleCallback): void;
    deleteTopology(uuid: string, callback: intf.SimpleCallback): void;
    private pingWorker(name);
    private unassignWaitingTopologies();
    private disableDefunctWorkers();
    private disableDefunctLeaders();
}
