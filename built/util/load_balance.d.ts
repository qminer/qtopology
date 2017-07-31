export interface Worker {
    name: string;
    weight: number;
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
    sort(): void;
}
/** This class calculates an advanced version load-balancing across workers.
 * Given list of workers and their current load, it returns a new worker
 * to assign the load to. The twist is that it also accepts worker affinity
 * and load weight.
*/
export declare class LoadBalancerEx {
    private workers;
    private affinity_factor;
    /** Constructor received the list of workers. Each worker
     * contains a name and a weight (current load).
     */
    constructor(wrkrs: Worker[], affinity_factor: number);
    /** Returns next worker to receive new load */
    next(affinity: string[], new_load?: number): string;
}
