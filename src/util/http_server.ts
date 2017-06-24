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
    (err: Error, data: any);
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
        logger.logger().debug("Sending response " + result);
        response.writeHead(200, { "Content-Type": "application/json" })
        response.end(JSON.stringify(result));
    }

    // Utility function for returning error response
    private handleError(error: string, response: http.ServerResponse) {
        logger.logger().error("Sending ERROR " + error);
        response.writeHead(500)
        response.end(error);
    }

    /** For registering simple handlers */
    addHandler(addr: string, callback: ProcessingHandler) {
        this.handlers[addr] = callback;
    }
    /** For registering simple static paths */
    addRoute(addr: string, local_path: string) {
        let rec = new RouteRec();
        rec.local_path = path.resolve(local_path);
        let ext = path.extname(local_path);
        rec.mime = mime_map.getMImeType(ext);
        this.routes[addr] = rec;
    }

    /** For running the server */
    run(port: number) {
        var server = http.createServer(this.withBody((req, resp) => {

            // get the HTTP method, path and body of the request
            var method = req.method;
            var addr = req.url;
            let data = null;
            logger.logger().debug("Handling " + addr);
            try {
                data = JSON.parse(req.body);
            } catch (e) {
                this.handleError("" + e, resp);
                return;
            }
            logger.logger().debug("Handling " + req.body);

            if (this.routes[addr]) {
                let rec = this.routes.get(addr);
                let stat = fs.statSync(rec.local_path);
                resp.writeHead(200, { 'Content-Type': rec.mime, 'Content-Length': stat.size });
                let readStream = fs.createReadStream(rec.local_path);
                readStream.pipe(resp);
            } else if (this.handlers[addr]) {
                try {
                    this.handlers[addr](data, (err, data) => {
                        if (err) return this.handleError(err, resp);
                        this.handleResponse(data, resp);
                    });
                } catch (e) {
                    this.handleError("" + e, resp);
                    return;
                }
            } else {
                this.handleError(`Unknown request: "${addr}"`, resp);
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
