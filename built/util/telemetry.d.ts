/** Simple class for collecting telemetry statistics for call durations */
export declare class Telemetry {
    private cnt;
    private min;
    private max;
    private avg;
    private name;
    constructor(name: string);
    add(duration: number): void;
    reset(): void;
    get(): {
        name: string;
        cnt: number;
        avg: number;
    };
}
