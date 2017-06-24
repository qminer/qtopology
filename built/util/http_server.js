"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const path = require("path");
const fs = require("fs");
const logger = require("./logger");
const mime_map = require("./http_server_mime_map");
class RouteRec {
}
class MinimalHttpServer {
    constructor() {
        this.handlers = new Map();
        this.routes = new Map();
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
        logger.logger().debug("Sending response " + result);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(result));
    }
    // Utility function for returning error response
    handleError(error, response) {
        logger.logger().error("Sending ERROR " + error);
        response.writeHead(500);
        response.end(error);
    }
    /** For registering simple handlers */
    addHandler(addr, callback) {
        if (!addr.startsWith("/")) {
            addr = "/" + addr;
        }
        this.handlers.set(addr, callback);
    }
    /** For registering simple static paths */
    addRoute(addr, local_path) {
        if (!addr.startsWith("/")) {
            addr = "/" + addr;
        }
        let rec = new RouteRec();
        rec.local_path = path.resolve(local_path);
        let ext = path.extname(local_path);
        rec.mime = mime_map.getMImeType(ext);
        this.routes.set(addr, rec);
    }
    /** For registering all files from certain directory as simple static paths */
    addDirectory(dir) {
        let files = fs.readdirSync(dir);
        files.forEach(x => {
            this.addRoute(x, path.join(dir, x));
        });
    }
    /** For running the server */
    run(port) {
        var server = http.createServer(this.withBody((req, resp) => {
            // get the HTTP method, path and body of the request
            var method = req.method;
            var addr = req.url;
            let data = null;
            logger.logger().debug("Handling " + addr);
            if (this.routes.has(addr)) {
                let rec = this.routes.get(addr);
                let stat = fs.statSync(rec.local_path);
                resp.writeHead(200, { 'Content-Type': rec.mime, 'Content-Length': stat.size });
                let readStream = fs.createReadStream(rec.local_path);
                readStream.pipe(resp);
            }
            else if (this.handlers.has(addr)) {
                try {
                    data = JSON.parse(req.body);
                }
                catch (e) {
                    this.handleError("" + e, resp);
                    return;
                }
                logger.logger().debug("Handling " + req.body);
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
            else {
                this.handleError(`Unknown request: "${addr}"`, resp);
            }
        }));
        server.listen(port, (err) => {
            if (err) {
                logger.logger().error("Error while starting server on port " + port);
                logger.logger().exception(err);
            }
            else {
                logger.logger().important("Server running on port " + port);
            }
        });
    }
}
exports.MinimalHttpServer = MinimalHttpServer;
//# sourceMappingURL=http_server.js.map