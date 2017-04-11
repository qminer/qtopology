"use strict";

const assert = require("assert");

/** This simple class calculates load-balancing across workers.
 * Given list of workers and their current load, it returns a sequence of
 * worker names in which new load should be assigned.
*/
class LoadBalancer {

    /** Constructor received the list of workers. Each worker
     * contains a name and a weight (current load).
     */
    constructor(workers) {
        assert(workers.length > 0, "Cannot perform load balancing on empty list of workers");
        this._workers = workers.slice(0); // creat a copy
        this._sort();
    }

    /** Returns next worker to receive new load */
    next() {
        let res = this._workers[0].name;
        this._workers[0].weight++;
        this._sort();
        return res;
    }

    /** Internal utility method */
    _sort() {
        this._workers.sort((a, b) => {
            if (a.weight === b.weight) return a.name.localeCompare(b.name);
            return a.weight - b.weight;
        });
    }
}

exports.LoadBalancer = LoadBalancer;
