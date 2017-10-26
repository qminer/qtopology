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
    constructor(log_prefix) {
        this.handlers = new Map();
        this.routes = new Map();
        this.log_prefix = (log_prefix || "[MinimalHttpServer]") + " ";
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
        logger.logger().debug(this.log_prefix + "Sending response " + JSON.stringify(result));
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(result || {}));
    }
    // Utility function for returning error response
    handleError(error, response) {
        logger.logger().error(this.log_prefix + "Sending ERROR " + error.message);
        logger.logger().exception(error);
        response.writeHead(500);
        response.end(error.message);
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
    /** For handling requests that have been received by another HTTP server object. */
    handle(method, addr, body, resp) {
        logger.logger().debug(this.log_prefix + `Handling ${method} ${addr}`);
        if (this.routes.has(addr)) {
            let rec = this.routes.get(addr);
            let stat = fs.statSync(rec.local_path);
            resp.writeHead(200, { 'Content-Type': rec.mime, 'Content-Length': stat.size });
            let readStream = fs.createReadStream(rec.local_path);
            readStream.pipe(resp);
        }
        else if (this.handlers.has(addr)) {
            let data = null;
            try {
                if (typeof body === "string") {
                    data = JSON.parse(body);
                }
                else {
                    data = body;
                }
            }
            catch (e) {
                this.handleError(e, resp);
                return;
            }
            logger.logger().debug(this.log_prefix + "Handling " + body);
            try {
                this.handlers.get(addr)(data, (err, data) => {
                    if (err)
                        return this.handleError(err, resp);
                    this.handleResponse(data, resp);
                });
            }
            catch (e) {
                this.handleError(e, resp);
                return;
            }
        }
        else {
            this.handleError(new Error(`Unknown request: "${addr}"`), resp);
        }
    }
    /** For running the server */
    run(port) {
        let server = http.createServer(this.withBody((req, resp) => {
            // get the HTTP method, path and body of the request
            // let method = req.method;
            let addr = req.url;
            logger.logger().debug(this.log_prefix + `Handling ${req.method} ${addr}`);
            if (this.routes.has(addr)) {
                let rec = this.routes.get(addr);
                let stat = fs.statSync(rec.local_path);
                resp.writeHead(200, { 'Content-Type': rec.mime, 'Content-Length': stat.size });
                let readStream = fs.createReadStream(rec.local_path);
                readStream.pipe(resp);
            }
            else if (this.handlers.has(addr)) {
                let data = null;
                try {
                    data = JSON.parse(req.body);
                }
                catch (e) {
                    this.handleError(e, resp);
                    return;
                }
                logger.logger().debug(this.log_prefix + "Handling " + req.body);
                try {
                    this.handlers.get(addr)(data, (err, data) => {
                        if (err)
                            return this.handleError(err, resp);
                        this.handleResponse(data, resp);
                    });
                }
                catch (e) {
                    this.handleError(e, resp);
                    return;
                }
            }
            else {
                this.handleError(new Error(`Unknown request: "${addr}"`), resp);
            }
        }));
        server.listen(port, (err) => {
            if (err) {
                logger.logger().error(this.log_prefix + "Error while starting server on port " + port);
                logger.logger().exception(err);
            }
            else {
                logger.logger().important(this.log_prefix + "Server running on port " + port);
            }
        });
    }
}
exports.MinimalHttpServer = MinimalHttpServer;
//# sourceMappingURL=http_server.js.map