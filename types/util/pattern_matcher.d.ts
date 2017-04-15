/** Simple class for pattern matching */
export declare class PaternMatcher {
    pattern: any;
    /** Constructor that receives pattern as object */
    constructor(pattern: any);
    /** Simple procedure for checking if given item
     *  matches the pattern.
     */
    isMatch(item: any): boolean;
}
