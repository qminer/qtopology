/** Simple class for pattern matching */
export declare class PaternMatcher {
    private pattern;
    private filters;
    /** Constructor that receives pattern as object */
    constructor(pattern: any);
    private matchSingleFilter;
    /** Simple procedure for checking if given item
     *  matches the pattern.
     */
    isMatch(item: any): boolean;
}
