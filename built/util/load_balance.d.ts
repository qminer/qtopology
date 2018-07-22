/** Simple worker description */
export interface Worker {
    name: string;
    weight: number;
}
/** Simple topology description */
export interface Topology {
    uuid: string;
    worker: string;
    weight: number;
    affinity: string[];
    forced_affinity: string[];
}
/** This class represents a single needed change for rebalancing */
export declare class RebalanceChange {
    uuid: string;
    worker_old: string;
    worker_new: string;
}
export declare class RebalanceResult {
    score: number;
    changes: RebalanceChange[];
}
/** This simple class calculates load-balancing across workers.
 * Given list of workers and their current load, it returns a sequence of
 * worker names in which new load should be assigned.
*/
export declare class LoadBalancer {
    private workers;
    /** Constructor received the list of workers. Each worker
     * contains a name and a weight (current load).
     */
    constructor(wrkrs: Worker[]);
    /** Returns next worker to receive new load */
    next(): string;
    /** Internal utility method */
    private sort();
}
/** This class calculates an advanced version load-balancing across workers.
 * Given list of workers and their current load, it returns a new worker
 * to assign the load to. The twist is that it also accepts worker affinity
 * and load weight.
 * It also conatins method that calculates re-assignments in case of severely uneven loads.
*/
export declare class LoadBalancerEx {
    private workers;
    private affinity_factor;
    /** Constructor received the list of workers. Each worker
     * contains a name and a weight (current load).
     */
    constructor(wrkrs: Worker[], affinity_factor: number);
    /** Gets a copy of internal state */
    getCurrentStats(): Worker[];
    /** Returns next worker to receive new load */
    next(affinity: string[], new_weight?: number): string;
    /** This method calculates near-optimal load and if current composition
     * is too different, it creates rebalancing instructions.
     */
    rebalance(topologies: Topology[]): RebalanceResult;
}
