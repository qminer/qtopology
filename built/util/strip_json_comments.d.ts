/**
 * Reads given file and transforms it into object.
 * It allows non-standard JSON comments.
 */
export declare function readJsonFileSync(fname: string): any;
/**
 * Utility function that removes comments from given JSON. Non-standard feature.
 * @param str - string containing JSON data with comments
 * @param opts - optional options object
 * @param opts.whitespace - should whitespaces also be removed
 */
export declare function stripJsonComments(str: string, opts?: any): string;
