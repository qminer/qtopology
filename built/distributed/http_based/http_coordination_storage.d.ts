import * as intf from "../../topology_interfaces";
export declare class HttpCoordinationStorage {
    private workers;
    private topologies;
    private messages;
    constructor();
    addTopology(config: any): void;
    /** Performs upsert of worker record. It's initial status is alive */
    registerWorker(name: string): {
        success: boolean;
    };
    /** Determines leadership status */
    getLeadershipStatus(): intf.LeadershipResultStatus;
    announceLeaderCandidacy(name: string): void;
    /** Checks if leadership candidacy for specified worker was successful. */
    checkLeaderCandidacy(name: string): boolean;
    /** Returns worker statuses */
    getWorkerStatuses(): intf.LeadershipResultWorkerStatus[];
    getTopologyStatuses(): intf.LeadershipResultTopologyStatus[];
    getTopologiesForWorker(name: string): intf.LeadershipResultTopologyStatus[];
    assignTopology(uuid: string, target: string): void;
    markTopologyAsRunning(uuid: string): void;
    markTopologyAsStopped(uuid: string): void;
    markTopologyAsError(uuid: string, error: string): void;
    setTopologyPing(uuid: string): {
        success: boolean;
    };
    setTopologyStatus(uuid: string, status: string, error: string): void | {
        success: boolean;
        error: string;
    };
    setWorkerStatus(name: string, status: string): {
        success: boolean;
    } | {
        success: boolean;
        error: string;
    };
    getMessagesForWorker(name: string): {
        cmd: string;
        content: any;
        worker: string;
    }[];
    private pingWorker(name);
    private unassignWaitingTopologies();
    private disableDefunctWorkers();
    private disableDefunctLeaders();
}
