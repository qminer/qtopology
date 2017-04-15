"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This simple class calculates load-balancing across workers.
 * Given list of workers and their current load, it returns a sequence of
 * worker names in which new load should be assigned.
*/
var LoadBalancer = (function () {
    /** Constructor received the list of workers. Each worker
     * contains a name and a weight (current load).
     */
    function LoadBalancer(wrkrs) {
        if (wrkrs.length == 0) {
            throw new Error("Cannot perform load-balancing on empty list of workers");
        }
        this.workers = wrkrs.slice(0); // creat a copy
        this.sort();
    }
    /** Returns next worker to receive new load */
    LoadBalancer.prototype.next = function () {
        var res = this.workers[0].name;
        this.workers[0].weight++;
        this.sort();
        return res;
    };
    /** Internal utility method */
    LoadBalancer.prototype.sort = function () {
        this.workers.sort(function (a, b) {
            if (a.weight === b.weight)
                return a.name.localeCompare(b.name);
            return a.weight - b.weight;
        });
    };
    return LoadBalancer;
}());
exports.LoadBalancer = LoadBalancer;
