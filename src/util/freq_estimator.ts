


export class EventFrequencyScore {

    private c: number;
    private prev_time: number;
    private prev_val: number;

    constructor(c: number) {
        if (c <= 0) {
            c = 1;
        }
        this.c = 1 / (9.5 * c); // this constant is based on experiments
        this.prev_time = 0;
        this.prev_val = 0;
    }

    private estimateFrequencyNum(t1: number, t2: number, v1: number, v2: number, c: number): number {
        return v2 + v1 * Math.exp(-c * (t2 - t1));
    }

    getEstimate(d: Date): number {
        return this.estimateFrequencyNum(this.prev_time, d.getTime(), this.prev_val, 0, this.c);
    }

    add(d: Date): number {
        let dd = d.getTime();
        let res = this.estimateFrequencyNum(this.prev_time, dd, this.prev_val, 1, this.c);
        this.prev_time = dd;
        this.prev_val = res;
        return res;
    }
}
