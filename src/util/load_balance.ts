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
}

/** This class represents needed change for rebalancing */
export class RebalanceChange {
    uuid: string;
    worker_old: string;
    worker_new: string;
}

export class RebalanceResult {
    score: number;
    changes: RebalanceChange[];
}

/** This simple class calculates load-balancing across workers.
 * Given list of workers and their current load, it returns a sequence of
 * worker names in which new load should be assigned.
*/
export class LoadBalancer {

    private workers: Worker[];

    /** Constructor received the list of workers. Each worker
     * contains a name and a weight (current load).
     */
    constructor(wrkrs: Worker[]) {
        if (wrkrs.length == 0) {
            throw new Error("Cannot perform load-balancing on empty list of workers");
        }
        this.workers = wrkrs.slice(0); // creat a copy
        this.sort();
    }

    /** Returns next worker to receive new load */
    next(): string {
        let res = this.workers[0].name;
        this.workers[0].weight++;
        this.sort();
        return res;
    }

    /** Internal utility method */
    private sort() {
        this.workers.sort((a, b) => {
            if (a.weight === b.weight) return a.name.localeCompare(b.name);
            return a.weight - b.weight;
        });
    }
}

/** This class calculates an advanced version load-balancing across workers.
 * Given list of workers and their current load, it returns a new worker
 * to assign the load to. The twist is that it also accepts worker affinity
 * and load weight.
 * It also conatins method that calculates re-assignments in case of severely uneven loads.
*/
export class LoadBalancerEx {

    private workers: Worker[];
    private affinity_factor: number;

    /** Constructor received the list of workers. Each worker
     * contains a name and a weight (current load).
     */
    constructor(wrkrs: Worker[], affinity_factor: number) {
        if (!wrkrs || wrkrs.length == 0) {
            throw new Error("Cannot perform load-balancing on empty list of workers");
        }
        this.workers = wrkrs.slice(0); // create a copy
        this.affinity_factor = affinity_factor || 5;
    }

    /** Gets a copy of internal state */
    getCurrentStats(): Worker[] {
        return this.workers.map(x => {
            return { name: x.name, weight: x.weight };
        });
    }

    /** Returns next worker to receive new load */
    next(affinity: string[], new_weight?: number): string {
        affinity = affinity || [];
        new_weight = new_weight || 1;

        let affinity_set = new Set<string>();
        affinity.forEach(x => { affinity_set.add(x); });

        let res: Worker;
        let res_load = Number.MAX_VALUE;

        for (let worker of this.workers) {
            let worker_weight = worker.weight + new_weight;
            if (affinity_set.has(worker.name)) {
                worker_weight /= this.affinity_factor;
            }
            if (worker_weight < res_load) {
                res = worker;
                res_load = worker_weight;
            }
        }

        res.weight += new_weight;
        return res.name;
    }

    /** This method calculates near-optimal load and if current composition
     * is too different, it creates rebalancing instructions.
     */
    rebalance(topologies: Topology[]): RebalanceResult {
        // create inner empty load-balancer
        let workers_tmp = this.workers.map(x => {
            return { name: x.name, weight: 0 };
        });
        let inner = new LoadBalancerEx(workers_tmp, this.affinity_factor);

        // sort topologies in smart way:
        // - first the ones with affinity, then the ones without
        // - when the same affinity length, compare by weight
        let sorter = (a: Topology, b: Topology): number => {
            if (a.affinity.length > 0) {
                if (b.affinity.length > 0) {
                    return a.affinity.length - b.affinity.length;
                } else {
                    return -1;
                }
            } else {
                if (b.affinity.length > 0) {
                    return 1;
                } else {
                    // sort by descending weight
                    return b.weight - a.weight;
                }
            }
        };
        let topologies_tmp = topologies.slice(0).sort(sorter); // shallow-copy and sort

        // loop greedily over topologies and insert them into load-balancer
        let changes: RebalanceChange[] = [];
        for (let t of topologies_tmp) {
            let worker_new = inner.next(t.affinity, t.weight);
            if (worker_new != t.worker) {
                changes.push({
                    uuid: t.uuid,
                    worker_new: worker_new,
                    worker_old: t.worker
                });
            }
        }

        // compare current state and "near-ideal" one
        let gold = inner.getCurrentStats();
        let current = this.getCurrentStats();
        let score = this.compareScore(gold, current);
        // if score is below 1.5, then the current load is not severely uneven.
        if (score < 1.5) {
            changes = [];
        }
        return { score: score, changes: changes };
    }

    /** Calculates deviation score - how bad is the current load
     * in comparison to the near-optimal one.
    */
    private compareScore(near_optimal: Worker[], current: Worker[]): number {
        let result = 0;
        for (let xa of near_optimal) {
            let found = false;
            for (let xb of current) {
                if (xa.name == xb.name) {
                    found = true;
                    if (xa.weight < xb.weight) {
                        result += (xa.weight == 0 ? 100 : xb.weight / xa.weight);
                    } else if (xa.weight > xb.weight) {
                        result += (xb.weight == 0 ? 100 : xa.weight / xb.weight);
                    }
                    break;
                }
            }
            if (!found) {
                result += 100;
            }
        }
        return result / near_optimal.length; // average score per server
    }
}
