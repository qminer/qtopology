"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EventFrequencyScore {
    constructor(c) {
        if (c <= 0) {
            c = 1;
        }
        this.c = 1 / (9.5 * c); // this constant is based on experiments
        this.prev_time = 0;
        this.prev_val = 0;
    }
    estimateFrequencyNum(t1, t2, v1, v2, c) {
        return v2 + v1 * Math.exp(-c * (t2 - t1));
    }
    getEstimate(d) {
        return this.estimateFrequencyNum(this.prev_time, d.getTime(), this.prev_val, 0, this.c);
    }
    add(d) {
        let dd = d.getTime();
        let res = this.estimateFrequencyNum(this.prev_time, dd, this.prev_val, 1, this.c);
        this.prev_time = dd;
        this.prev_val = res;
        return res;
    }
}
exports.EventFrequencyScore = EventFrequencyScore;
//# sourceMappingURL=freq_estimator.js.map