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
export declare class MinimalHttpServer {
    private handlers;
    private routes;
    constructor();
    private withBody(handler);
    private handleResponse(result, response);
    private handleError(error, response);
    /** For registering simple handlers */
    addHandler(addr: string, callback: ProcessingHandler): void;
    /** For registering simple static paths */
    addRoute(addr: string, local_path: string): void;
    /** For running the server */
    run(port: number): void;
}
