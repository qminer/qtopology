"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
/** Internal class for storing statistics */
class Rec {
    constructor() {
        this.avg = 0;
        this.count = 0;
        this.max = Number.MIN_VALUE;
        this.min = Number.MAX_VALUE;
    }
    reset() {
        this.avg = 0;
        this.count = 0;
        this.max = Number.MIN_VALUE;
        this.min = Number.MAX_VALUE;
    }
    add(val) {
        this.count++;
        this.avg = ((this.count - 1) / this.count) * this.avg + val / this.count;
        this.min = (this.min > val ? val : this.min);
        this.max = (this.max < val ? val : this.max);
    }
    report() {
        let res = {
            count: this.count,
            avg: null,
            min: null,
            max: null
        };
        if (res.count > 0) {
            res.min = this.min;
            res.max = this.max;
            res.avg = this.avg;
        }
        return res;
    }
}
exports.Rec = Rec;
/** Internal class that lives in a tree structure */
class Node {
    constructor() {
        this.data = new Rec();
        this.children = {};
    }
    add(val, tags, tag_index) {
        this.data.add(val);
        for (let tag_index2 = tag_index; tag_index2 < tags.length; tag_index2++) {
            let tag = tags[tag_index2];
            if (!this.children[tag]) {
                this.children[tag] = new Node();
            }
            this.children[tag].add(val, tags, tag_index2 + 1);
        }
    }
    report(prefix, result) {
        result.push([prefix, this.data.report()]);
        prefix = prefix + (prefix.length > 0 ? "." : "");
        for (let c of Object.getOwnPropertyNames(this.children)) {
            this.children[c].report(prefix + c, result);
        }
    }
    reset() {
        this.data = new Rec();
        this.children = {};
    }
}
exports.Node = Node;
/** This class processes incoming single-metric data by counting and keeping various statistics
 * about it, and then publishing it when requested. */
class Accumulator {
    constructor(name) {
        this.name = name;
        this.map = new Node();
    }
    add(val, tags) {
        let ttags = tags.slice(0);
        ttags.sort();
        this.map.add(val, ttags, 0);
    }
    report() {
        let result = [];
        this.map.report("", result);
        return result;
    }
    reset() {
        this.map.reset();
    }
}
exports.Accumulator = Accumulator;
/** This bolt processes incoming data by counting and keeping various statistics
 * about it, and then publishing them at regular intervals. */
class AccumulatorBolt {
    constructor() {
        this.last_ts = Number.MIN_VALUE;
        this.granularity = 10 * 60 * 1000;
        this.onEmit = null;
        this.accumulators = [];
    }
    init(name, config, context, callback) {
        this.onEmit = config.onEmit;
        this.granularity = config.granularity || this.granularity;
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        async.series([
            (xcallback) => {
                // process timestamp and send stats up until timestamp
                let ts = data.ts;
                if (data.ts instanceof Date) {
                    ts = data.ts.getTime();
                }
                if (this.last_ts == Number.MIN_VALUE) {
                    this.last_ts = Math.floor(ts / this.granularity);
                }
                this.catchUpTimestamp(ts, xcallback);
            },
            (xcallback) => {
                // transform tags
                let tags = [];
                for (let f of Object.getOwnPropertyNames(data.tags)) {
                    tags.push(`${f}="${data.tags[f]}`);
                }
                // process each metric
                for (let f of Object.getOwnPropertyNames(data.values)) {
                    let acc_match = null;
                    ;
                    for (let acc of this.accumulators) {
                        if (acc.name == f) {
                            acc_match = acc;
                            break;
                        }
                    }
                    if (!acc_match) {
                        acc_match = new Accumulator(f);
                        this.accumulators.push(acc_match);
                    }
                    acc_match.add(data.values[f], tags);
                }
                xcallback();
            }
        ], callback);
    }
    catchUpTimestamp(ts, callback) {
        async.whilst(() => {
            return Math.floor(ts / this.granularity) != this.last_ts;
        }, (xcallback) => {
            this.sendAggregates(xcallback);
        }, callback);
    }
    sendAggregates(callback) {
        async.series([
            (xcallback) => {
                // prepare items to send
                let report = [];
                for (let acc of this.accumulators) {
                    let stats = acc.report();
                    for (let stat of stats) {
                        let name = acc.name + (stat[0].length > 0 ? "." : "") + stat[0];
                        report.push({
                            ts: this.last_ts * this.granularity,
                            name: name,
                            stats: stat[1]
                        });
                    }
                    acc.reset();
                }
                // emit data
                async.each(report, (item, xxcallback) => {
                    this.onEmit(item, null, xxcallback);
                }, xcallback);
            },
            (xcallback) => {
                this.last_ts++; // += this.granularity;
                xcallback();
            }
        ], callback);
    }
}
exports.AccumulatorBolt = AccumulatorBolt;
//# sourceMappingURL=accumulator_bolt.js.map