/// <reference types="node" />
import * as stream from "stream";
/** This class is stream-transforming object that can be piped.
 * It splits input data into lines and emits them one-by-one.
 */
export declare class Liner extends stream.Transform {
    private lastLineData;
    constructor();
    _transform(chunk: any, encoding: any, done: any): void;
    _flush(done: any): void;
}
export interface Parser {
    addLine(line: string): any;
}
export declare function importFileByLine(fname: string, line_parser: Parser, callback?: () => void): void;
