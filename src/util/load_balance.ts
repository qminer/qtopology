
interface Worker {
    name: string;
    weight: number;
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
    sort() {
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

    /** Returns next worker to receive new load */
    next(affinity: string[], new_load?: number): string {

        affinity = affinity || [];
        new_load = new_load || 1;

        let affinity_set = new Set<string>();
        affinity.forEach(x => { affinity_set.add(x); });

        let res: Worker;
        let res_load = Number.MAX_VALUE;

        for (let worker of this.workers) {
            let worker_weight = worker.weight + new_load;
            if (affinity_set.has(worker.name)) {
                worker_weight /= this.affinity_factor;
            }
            if (worker_weight < res_load) {
                res = worker;
                res_load = worker_weight;
            }
        }

        res.weight += new_load;
        return res.name;
    }
}
