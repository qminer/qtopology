export declare class Rec {
    count: number;
    min: number;
    max: number;
    avg: number;
    constructor();
    reset(): void;
    add(val: number): void;
    report(): {
        min: number;
        max: number;
        avg: number;
        count: number;
    };
}
export declare class Node {
    data: Rec;
    children: any;
    constructor();
    add(val: number, tags: string[], tag_index: number): void;
    report(prefix: string, result: any): void;
    reset(): void;
}
/** This class processes incoming data by counting and keeping various statistics
 * about it, and then publishing it when requested. */
export declare class Accumulator {
    private map;
    constructor();
    add(val: number, tags: string[]): void;
    report(): any[];
}
