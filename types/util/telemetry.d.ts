/** Simple class for collecting telemetry statistics for call durations */
export declare class Telemetry {
    cnt: number;
    min: number;
    max: number;
    avg: number;
    name: string;
    constructor(name: string);
    add(duration: number): void;
    reset(): void;
    get(): {
        name: string;
        cnt: number;
        avg: number;
    };
}
