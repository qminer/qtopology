import * as http from "http";
import * as path from "path";
import * as fs from "fs";
import * as logger from "./logger";
import * as mime_map from "./http_server_mime_map";

///////////////////////////////////////////////////////////////////////////
// Bare minimum REST server

export interface RequestWithBody extends http.IncomingMessage {
    body: string;
}
interface Handler {
    (req: RequestWithBody, res: http.ServerResponse);
}
export interface ProcessingHandlerCallback {
    (err: Error, data?: any);
}
export interface ProcessingHandler {
    (data: any, callback: ProcessingHandlerCallback);
}
class RouteRec {
    local_path: string;
    mime: string;
}

export class MinimalHttpServer {

    // registered handlers
    private handlers: Map<string, ProcessingHandler>;
    // registered static content
    private routes: Map<string, RouteRec>;

    constructor() {
        this.handlers = new Map<string, ProcessingHandler>();
        this.routes = new Map<string, RouteRec>();
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
        logger.logger().debug("Sending response " + JSON.stringify(result));
        response.writeHead(200, { "Content-Type": "application/json" })
        response.end(JSON.stringify(result));
    }

    // Utility function for returning error response
    private handleError(error: Error, response: http.ServerResponse) {
        logger.logger().error("Sending ERROR " + error.message);
        logger.logger().exception(error);
        response.writeHead(500)
        response.end(error.message);
    }

    /** For registering simple handlers */
    addHandler(addr: string, callback: ProcessingHandler) {
        if (!addr.startsWith("/")) {
            addr = "/" + addr;
        }
        this.handlers.set(addr, callback);
    }
    /** For registering simple static paths */
    addRoute(addr: string, local_path: string) {
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
    addDirectory(dir: string) {
        let files = fs.readdirSync(dir);
        files.forEach(x => {
            this.addRoute(x, path.join(dir, x));
        });
    }

    /** For running the server */
    run(port: number) {
        var server = http.createServer(this.withBody((req, resp) => {

            // get the HTTP method, path and body of the request
            var method = req.method;
            var addr = req.url;
            let data = null;
            logger.logger().debug(`Handling ${req.method} ${addr}`);
            if (this.routes.has(addr)) {
                let rec = this.routes.get(addr);
                let stat = fs.statSync(rec.local_path);
                resp.writeHead(200, { 'Content-Type': rec.mime, 'Content-Length': stat.size });
                let readStream = fs.createReadStream(rec.local_path);
                readStream.pipe(resp);
            } else if (this.handlers.has(addr)) {
                try {
                    data = JSON.parse(req.body);
                } catch (e) {
                    this.handleError(e, resp);
                    return;
                }
                logger.logger().debug("Handling " + req.body);
                try {
                    this.handlers.get(addr)(data, (err, data) => {
                        if (err) return this.handleError(err, resp);
                        this.handleResponse(data, resp);
                    });
                } catch (e) {
                    this.handleError(e, resp);
                    return;
                }
            } else {
                this.handleError(new Error(`Unknown request: "${addr}"`), resp);
            }
        }));

        server.listen(port, (err: Error) => {
            if (err) {
                logger.logger().error("Error while starting server on port " + port);
                logger.logger().exception(err);
            } else {
                logger.logger().important("Server running on port " + port);
            }
        });
    }
}
