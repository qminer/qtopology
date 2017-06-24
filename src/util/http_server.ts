import * as http from "http";

///////////////////////////////////////////////////////////////////////////
// Bare minimum REST server

export interface RequestWithBody extends http.IncomingMessage {
    body: string;
}
interface Handler {
    (req: RequestWithBody, res: http.ServerResponse);
}
export interface ProcessingHandlerCallback {
    (err: Error, data: any);
}
export interface ProcessingHandler {
    (data: any, callback: ProcessingHandlerCallback);
}

export class MinimalHttpServer {

    // registered handlers
    private handlers: Map<string, ProcessingHandler>;

    constructor() {
        this.handlers = new Map<string, ProcessingHandler>();
    }

    // Utility function that reads requests body
    private withBody(handler: Handler): Handler {
        return (req, resp) => {
            let input = "";
            req.on("data", (chunk) => { input += chunk; });
            req.on("end", () => { req.body = input; handler(req, resp); });
        }
    };

    // Utility function for returning response
    private handleResponse(result: any, response: http.ServerResponse) {
        console.log("Sending response", result);
        response.writeHead(200, { "Content-Type": "application/json" })
        response.end(JSON.stringify(result));
    }

    // Utility function for returning error response
    private handleError(error: string, response: http.ServerResponse) {
        console.log("Sending ERROR", error);
        response.writeHead(500)
        response.end(error);
    }

    /** For registering simple handlers */
    addHandler(addr: string, callback: ProcessingHandler) {
        this.handlers[addr] = callback;
    }

    /** For running the server */
    run(port: number) {
        var server = http.createServer(this.withBody((req, resp) => {

            // get the HTTP method, path and body of the request
            var method = req.method;
            var addr = req.url;
            let data = null;
            console.log("Handling", addr);
            try {
                data = JSON.parse(req.body);
            } catch (e) {
                this.handleError("" + e, resp);
                return;
            }
            console.log("Handling", req.body);

            if (!this.handlers[addr]) {
                this.handleError(`Unknown request: "${addr}"`, resp);
            } else {
                try {
                    this.handlers[addr](data, (err, data) => {
                        if (err) return this.handleError(err, resp);
                        this.handleResponse(data, resp);
                    });
                } catch (e) {
                    this.handleError("" + e, resp);
                    return;
                }
            }
        }));

        server.listen(port, (err) => {
            if (err) {
                console.log("Error while starting server on port", port);
                console.log("Error:", err);
            } else {
                console.log("Server running on port", port);
            }
        });
    }
}
