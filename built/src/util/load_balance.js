"use strict";
var assert = require("assert");
/** This simple class calculates load-balancing across workers.
 * Given list of workers and their current load, it returns a sequence of
 * worker names in which new load should be assigned.
*/
var LoadBalancer = (function () {
    /** Constructor received the list of workers. Each worker
     * contains a name and a weight (current load).
     */
    function LoadBalancer(workers) {
        assert(workers.length > 0, "Cannot perform load balancing on empty list of workers");
        this._workers = workers.slice(0); // creat a copy
        this._sort();
    }
    /** Returns next worker to receive new load */
    LoadBalancer.prototype.next = function () {
        var res = this._workers[0].name;
        this._workers[0].weight++;
        this._sort();
        return res;
    };
    /** Internal utility method */
    LoadBalancer.prototype._sort = function () {
        this._workers.sort(function (a, b) {
            if (a.weight === b.weight)
                return a.name.localeCompare(b.name);
            return a.weight - b.weight;
        });
    };
    return LoadBalancer;
}());
exports.LoadBalancer = LoadBalancer;
