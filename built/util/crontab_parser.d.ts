export declare class CronTabParser {
    private parts;
    private simple_regex;
    private dow_regex;
    constructor(s: string);
    private miniTest(val, bounds);
    isIncluded(target: Date): boolean;
}
