export declare class EventFrequencyScore {
    private c;
    private prev_time;
    private prev_val;
    constructor(c: number);
    private estimateFrequencyNum;
    getEstimate(d: Date): number;
    add(d: Date): number;
}
