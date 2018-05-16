"use strict";
//import * as intf from "../topology_interfaces";
Object.defineProperty(exports, "__esModule", { value: true });
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
        return {
            min: this.min,
            max: this.max,
            avg: this.avg,
            count: this.count,
        };
    }
}
exports.Rec = Rec;
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
/** This class processes incoming data by counting and keeping various statistics
 * about it, and then publishing it when requested. */
class Accumulator {
    constructor() {
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
}
exports.Accumulator = Accumulator;
// /** This bolt processes incoming data by counting and keeping various statistics
//  * about it, and then publishing them at regular intervals. */
// export class AccumulatorBolt implements intf.Bolt {
// private last_ts: number;
// private granularity: number;
//     private onEmit: intf.BoltEmitCallback;
//     constructor() {
// this.last_ts = Number.MIN_VALUE;
// this.granularity = granularity;
//         this.onEmit = null;
//         this.extra_fields = null;
//     }
//     init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
//         this.onEmit = config.onEmit;
//         this.extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
//         callback();
//     }
//     heartbeat() { }
//     shutdown(callback: intf.SimpleCallback) {
//         callback();
//     }
//     receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
//         oo.overrideObject(data, this.extra_fields, false);
//         this.onEmit(data, stream_id, callback);
//     }
// }
//# sourceMappingURL=accumulator_bolt.js.map