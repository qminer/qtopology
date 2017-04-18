import * as http from "http";

///////////////////////////////////////////////////////////////////////////
// Bare minimum REST server

export interface RequestWithBody extends http.IncomingMessage {
    body: string;
}
interface Handler {
    (req: RequestWithBody, res: http.ServerResponse);
}
interface ProcessingHandlerCallback {
    (err: Error, data: any);
}
export interface ProcessingHandler {
    (data: any, callback: ProcessingHandlerCallback);
}
// Utility function that reads requests body
function withBody(handler: Handler): Handler {
    return (req, resp) => {
        let input = "";
        req.on("data", (chunk) => { input += chunk; });
        req.on("end", () => { req.body = input; handler(req, resp); });
    }
};

// Utility function for returning response
function handleResponse(result: any, response: http.ServerResponse) {
    console.log("Sending response", result);
    response.writeHead(200, { "Content-Type": "application/json" })
    response.end(JSON.stringify(result));
}

// Utility function for returning error response
function handleError(error: string, response: http.ServerResponse) {
    console.log("Sending ERROR", error);
    response.writeHead(500)
    response.end(error);
}

// registered handlers
let handlers = new Map<string, ProcessingHandler>();

/** For registering simple handlers */
export function addHandler(addr: string, callback: ProcessingHandler) {
    handlers[addr] = callback;
}

/** For running the server */
export function run(port: number) {
    var server = http.createServer(withBody((req, resp) => {

        // get the HTTP method, path and body of the request
        var method = req.method;
        var addr = req.url;
        let data = null;
        console.log("Handling", addr);
        try {
            data = JSON.parse(req.body);
        } catch (e) {
            handleError("" + e, resp);
            return;
        }
        console.log("Handling", req.body);

        if (!handlers[addr]) {
            handleError(`Unknown request: "${addr}"`, resp);
        } else {
            try {
                handlers[addr](data, (err, data) => {
                    if (err) return handleError(err, resp);
                    handleResponse(data, resp);
                });
            } catch (e) {
                handleError("" + e, resp);
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
