import * as intf from "../topology_interfaces";
import * as async from "async";
import { logger } from "../util/logger";

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
    children: Map<string, Node>;

    constructor() {
        this.data = new Rec();
        this.children = new Map<string, Node>();
    }

    add(val: number, tags: string[], tag_index: number) {
        this.data.add(val);
        for (let tag_index2 = tag_index; tag_index2 < tags.length; tag_index2++) {
            let tag = tags[tag_index2];
            if (!this.children.has(tag)) {
                this.children.set(tag, new Node());
            }
            this.children.get(tag).add(val, tags, tag_index2 + 1);
        }
    }

    report(prefix: string, result) {
        result.push([prefix, this.data.report()]);
        prefix = prefix + (prefix.length > 0 ? "." : "");
        for (let c of this.children.keys()) {
            this.children.get(c).report(prefix + c, result);
        }
    }

    reset() {
        this.data.reset();
        for (let c of this.children.keys()) {
            this.children.get(c).reset();
        }
    }
}

/** Internal class that lives in a tree structure */
export class PartitionNode {
    child: Node;
    pchildren: Map<string, PartitionNode>;

    constructor() {
        this.child = null;
        this.pchildren = new Map<string, PartitionNode>();
    }

    add(val: number, ptags: string[], tags: string[]) {
        if (ptags.length == 0) {
            if (!this.child) {
                this.child = new Node();
            }
            this.child.add(val, tags, 0);
        } else {
            let ptag = ptags[0];
            ptags = ptags.slice(1);
            if (!this.pchildren.has(ptag)) {
                this.pchildren.set(ptag, new PartitionNode());
            }
            this.pchildren.get(ptag).add(val, ptags, tags);
        }
    }

    report(prefix: string, result) {
        if (this.child) {
            this.child.report(prefix, result);
        } else {
            prefix = prefix + (prefix.length > 0 ? "." : "");
            for (let c of this.pchildren.keys()) {
                this.pchildren.get(c).report(prefix + c, result);
            }
        }
    }

    reset() {
        if (this.child) {
            this.child.reset();
        }
        for (let pc of this.pchildren.keys()) {
            this.pchildren[pc].reset();
        }
    }
}

/**
 * This class processes incoming single-metric data
 * by counting and keeping various statistics
 * about it, and then publishing it when requested. */

export class SingleMetricAccumulator {

    private map: PartitionNode;
    public name: string;

    constructor(name: string) {
        this.name = name;
        this.map = new PartitionNode();
    }

    add(val: number, ptags: string[], tags: string[]) {
        let ttags = tags.slice(0);
        ttags.sort();
        this.map.add(val, ptags, ttags);
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
    private emit_zero_counts: boolean;
    private granularity: number;
    private emit_gdr: boolean;
    private ignore_tags: string[];
    private partition_tags: string[];
    private onEmit: intf.BoltEmitCallback;
    private accumulators: SingleMetricAccumulator[];

    constructor() {
        this.emit_zero_counts = false;
        this.emit_gdr = false;
        this.last_ts = Number.MIN_VALUE;
        this.granularity = 10 * 60 * 1000;
        this.onEmit = null;
        this.accumulators = [];
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.emit_zero_counts = config.emit_zero_counts;
        this.emit_gdr = !!(config.emit_gdr);
        this.ignore_tags = (config.ignore_tags || []).slice();
        this.partition_tags = (config.partition_tags || []).slice();
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
                    let partition_tags: string[] = [];
                    let tags: string[] = [];
                    for (let f of Object.getOwnPropertyNames(data.tags)) {
                        if (this.ignore_tags.indexOf(f) >= 0) {
                            continue;
                        }
                        let s = `${f}=${data.tags[f]}`;
                        if (this.partition_tags.indexOf(f) >= 0) {
                            partition_tags.push(s);
                        } else {
                            tags.push(s);
                        }
                    }

                    // process each metric
                    for (let f of Object.getOwnPropertyNames(data.values)) {
                        let acc_match: SingleMetricAccumulator = null;
                        for (let acc of this.accumulators) {
                            if (acc.name == f) {
                                acc_match = acc;
                                break;
                            }
                        }
                        if (!acc_match) {
                            acc_match = new SingleMetricAccumulator(f);
                            this.accumulators.push(acc_match);
                        }
                        acc_match.add(data.values[f], partition_tags, tags);
                    }
                    xcallback();
                }
            ],
            callback
        );
    }

    /** Repeatedly sends aggregates until aggregation watermark
     * reaches given timestamp.
      */
    catchUpTimestamp(ts, callback) {
        async.whilst(
            () => {
                return Math.floor(ts / this.granularity) > this.last_ts;
            },
            (xcallback) => {
                this.sendAggregates(xcallback);
            },
            callback
        );
    }

    /** Internal utility function that parses name into tag values */
    name2tags(name: string): any {
        let res = {}
        name
            .split(".")
            .slice(1)
            .forEach(x => {
                let [n, v] = x.split("=");
                res[n] = v;
            });
        return res;
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
                            if (this.emit_gdr) {
                                let tags = this.name2tags(name);
                                tags["$name"] = name;
                                tags["$metric"] = acc.name;
                                report.push(
                                    {
                                        ts: this.last_ts * this.granularity,
                                        tags: tags,
                                        values: stat[1]
                                    }
                                );
                            } else {
                                report.push(
                                    { ts: this.last_ts * this.granularity, name: name, stats: stat[1] }
                                );
                            };
                        }
                    }

                    logger().log("Emitting accumulated data for " + (new Date(this.last_ts * this.granularity)));
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
                    if (this.emit_zero_counts) {
                        for (let acc of this.accumulators) {
                            acc.reset();
                        };
                    } else {
                        this.accumulators = [];
                    }
                    this.last_ts++;
                    xcallback();
                }
            ],
            callback);
    }
}
