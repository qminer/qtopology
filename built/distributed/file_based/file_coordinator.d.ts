import * as intf from "../../topology_interfaces";
export declare class FileCoordinator implements intf.CoordinationStorage {
    private msgs;
    private dir_name;
    private file_patterns;
    private file_patterns_regex;
    private topology_configs;
    constructor(dir_name: string, file_pattern: string | string[]);
    getProperties(callback: intf.SimpleResultCallback<intf.StorageProperty[]>): void;
    getMessages(name: string, callback: intf.SimpleResultCallback<intf.StorageResultMessage[]>): void;
    getWorkerStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultWorkerStatus[]>): void;
    getTopologyStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>): void;
    getTopologyDefinition(uuid: string, callback: intf.SimpleResultCallback<any>): void;
    getTopologiesForWorker(worker: string, callback: intf.SimpleResultCallback<intf.LeadershipResultTopologyStatus[]>): void;
    getLeadershipStatus(callback: intf.SimpleResultCallback<intf.LeadershipResultStatus>): void;
    registerWorker(name: string, callback: intf.SimpleCallback): void;
    announceLeaderCandidacy(name: string, callback: intf.SimpleCallback): void;
    checkLeaderCandidacy(name: string, callback: intf.SimpleResultCallback<boolean>): void;
    assignTopology(uuid: string, worker: string, callback: intf.SimpleCallback): void;
    setTopologyStatus(uuid: string, status: string, error: string, callback: intf.SimpleCallback): void;
    setWorkerStatus(worker: string, status: string, callback: intf.SimpleCallback): void;
    registerTopology(uuid: string, config: any, callback: intf.SimpleCallback): void;
    disableTopology(uuid: string, callback: intf.SimpleCallback): void;
    enableTopology(uuid: string, callback: intf.SimpleCallback): void;
    deleteTopology(uuid: string, callback: intf.SimpleCallback): void;
    private createRegexpForPattern(str);
}
