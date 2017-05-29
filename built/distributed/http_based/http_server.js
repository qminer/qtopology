"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
class MinimalHttpServer {
    constructor() {
        this.handlers = new Map();
    }
    // Utility function that reads requests body
    withBody(handler) {
        return (req, resp) => {
            let input = "";
            req.on("data", (chunk) => { input += chunk; });
            req.on("end", () => { req.body = input; handler(req, resp); });
        };
    }
    ;
    // Utility function for returning response
    handleResponse(result, response) {
        console.log("Sending response", result);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(result));
    }
    // Utility function for returning error response
    handleError(error, response) {
        console.log("Sending ERROR", error);
        response.writeHead(500);
        response.end(error);
    }
    /** For registering simple handlers */
    addHandler(addr, callback) {
        this.handlers[addr] = callback;
    }
    /** For running the server */
    run(port) {
        var server = http.createServer(this.withBody((req, resp) => {
            // get the HTTP method, path and body of the request
            var method = req.method;
            var addr = req.url;
            let data = null;
            console.log("Handling", addr);
            try {
                data = JSON.parse(req.body);
            }
            catch (e) {
                this.handleError("" + e, resp);
                return;
            }
            console.log("Handling", req.body);
            if (!this.handlers[addr]) {
                this.handleError(`Unknown request: "${addr}"`, resp);
            }
            else {
                try {
                    this.handlers[addr](data, (err, data) => {
                        if (err)
                            return this.handleError(err, resp);
                        this.handleResponse(data, resp);
                    });
                }
                catch (e) {
                    this.handleError("" + e, resp);
                    return;
                }
            }
        }));
        server.listen(port, (err) => {
            if (err) {
                console.log("Error while starting server on port", port);
                console.log("Error:", err);
            }
            else {
                console.log("Server running on port", port);
            }
        });
    }
}
exports.MinimalHttpServer = MinimalHttpServer;
//# sourceMappingURL=http_server.js.map