import * as intf from "../topology_interfaces";
import * as async from "async";

/** Internal class for storing statistics */
export class Rec {
    count: number;
    min: number;
    max: number;
    avg: number;

    constructor() {
        this.avg = 0;
        this.count = 0;
        this.max = Number.MIN_VALUE;
        this.min = Number.MAX_VALUE;
    }

    reset(): void {
        this.avg = 0;
        this.count = 0;
        this.max = Number.MIN_VALUE;
        this.min = Number.MAX_VALUE;
    }

    add(val: number): void {
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

/** Internal class that lives in a tree structure */
export class Node {
    data: Rec;
    children: any;

    constructor() {
        this.data = new Rec();
        this.children = {};
    }

    add(val: number, tags: string[], tag_index: number) {
        this.data.add(val);
        for (let tag_index2 = tag_index; tag_index2 < tags.length; tag_index2++) {
            let tag = tags[tag_index2];
            if (!this.children[tag]) {
                this.children[tag] = new Node();
            }
            this.children[tag].add(val, tags, tag_index2 + 1);
        }
    }

    report(prefix: string, result) {
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


/** This class processes incoming single-metric data by counting and keeping various statistics
 * about it, and then publishing it when requested. */

export class Accumulator {

    private map: Node;
    public name: string;

    constructor(name: string) {
        this.name = name;
        this.map = new Node();
    }

    add(val: number, tags: string[]) {
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

/** This bolt processes incoming data by counting and keeping various statistics
 * about it, and then publishing them at regular intervals. */

export class AccumulatorBolt implements intf.Bolt {

    private last_ts: number;
    private granularity: number;
    private onEmit: intf.BoltEmitCallback;
    private accumulators: Accumulator[];

    constructor() {
        this.last_ts = Number.MIN_VALUE;
        this.granularity = 10 * 60 * 1000;
        this.onEmit = null;
        this.accumulators = [];
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.granularity = config.granularity || this.granularity;
        callback();
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        async.series(
            [
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
                        let acc_match = null;;
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
            ],
            callback
        );
    }

    catchUpTimestamp(ts, callback) {
        async.whilst(
            () => {
                return Math.floor(ts / this.granularity) != this.last_ts;
            },
            (xcallback) => {
                this.sendAggregates(xcallback);
            },
            callback
        );
    }

    sendAggregates(callback) {
        async.series(
            [
                (xcallback) => {
                    // prepare items to send
                    let report = [];
                    for (let acc of this.accumulators) {
                        let stats = acc.report();
                        for (let stat of stats) {
                            let name = acc.name + (stat[0].length > 0 ? "." : "") + stat[0];
                            report.push(
                                {
                                    ts: this.last_ts * this.granularity,
                                    name: name,
                                    stats: stat[1]
                                }
                            );
                        }
                        acc.reset();
                    }
                    // emit data
                    async.each(
                        report,
                        (item, xxcallback) => {
                            this.onEmit(item, null, xxcallback);
                        },
                        xcallback
                    );
                },
                (xcallback) => {
                    this.last_ts++; // += this.granularity;
                    xcallback();
                }
            ],
            callback);
    }
}
