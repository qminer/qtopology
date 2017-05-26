import * as http from "http";
export interface RequestWithBody extends http.IncomingMessage {
    body: string;
}
export interface ProcessingHandlerCallback {
    (err: Error, data: any): any;
}
export interface ProcessingHandler {
    (data: any, callback: ProcessingHandlerCallback): any;
}
/** For registering simple handlers */
export declare function addHandler(addr: string, callback: ProcessingHandler): void;
/** For running the server */
export declare function run(port: number): void;
