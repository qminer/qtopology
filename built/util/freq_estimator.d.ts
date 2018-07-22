export declare class EventFrequencyScore {
    private c;
    private prev_time;
    private prev_val;
    constructor(c: number);
    private estimateFrequencyNum(t1, t2, v1, v2, c);
    getEstimate(d: Date): number;
    add(d: Date): number;
}
