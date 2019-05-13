import * as http from "http";
import * as path from "path";
import * as fs from "fs";
import * as logger from "./logger";
import * as mime_map from "./http_server_mime_map";

///////////////////////////////////////////////////////////////////////////
// Bare minimum REST server

export interface IRequestWithBody extends http.IncomingMessage {
    body: string;
}
interface IHandler {
    (req: IRequestWithBody, res: http.ServerResponse);
}
export interface IProcessingHandlerCallback {
    (err: Error, data?: any);
}
export interface IProcessingHandler {
    (data: any, callback: IProcessingHandlerCallback);
}
class RouteRec {
    public local_path: string;
    public mime: string;
}

export class MinimalHttpServer {

    // registered handlers
    private handlers: Map<string, IProcessingHandler>;
    // registered static content
    private routes: Map<string, RouteRec>;
    // prefix for logging messages
    private log_prefix: string;

    constructor(log_prefix?: string) {
        this.handlers = new Map<string, IProcessingHandler>();
        this.routes = new Map<string, RouteRec>();
        this.log_prefix = (log_prefix || "[MinimalHttpServer]") + " ";
    }

    /** For registering simple handlers */
    public addHandler(addr: string, callback: IProcessingHandler) {
        if (!addr.startsWith("/")) {
            addr = "/" + addr;
        }
        this.handlers.set(addr, callback);
    }
    /** For registering simple static paths */
    public addRoute(addr: string, local_path: string) {
        if (!addr.startsWith("/")) {
            addr = "/" + addr;
        }
        const rec = new RouteRec();
        rec.local_path = path.resolve(local_path);
        const ext = path.extname(local_path);
        rec.mime = mime_map.getMImeType(ext);
        this.routes.set(addr, rec);
    }
    /** For registering all files from certain directory as simple static paths */
    public addDirectory(dir: string) {
        const files = fs.readdirSync(dir);
        files.forEach(x => {
            this.addRoute(x, path.join(dir, x));
        });
    }

    /** For handling requests that have been received by another HTTP server object. */
    public handle(method: string, addr: string, body: any, resp: http.ServerResponse) {
        logger.logger().debug(this.log_prefix + `Handling ${method} ${addr}`);
        if (this.routes.has(addr)) {
            const rec = this.routes.get(addr);
            const stat = fs.statSync(rec.local_path);
            resp.writeHead(200, { "Content-Type": rec.mime, "Content-Length": stat.size });
            const readStream = fs.createReadStream(rec.local_path);
            readStream.pipe(resp);
        } else if (this.handlers.has(addr)) {
            let data = null;
            try {
                if (typeof body === "string") {
                    data = JSON.parse(body as any);
                } else {
                    data = body;
                }
            } catch (e) {
                this.handleError(e, resp);
                return;
            }
            logger.logger().debug(this.log_prefix + "Handling " + body);
            try {
                this.handlers.get(addr)(data, (err, data_inner) => {
                    if (err) {
                        return this.handleError(err, resp);
                    }
                    this.handleResponse(data_inner, resp);
                });
            } catch (e) {
                this.handleError(e, resp);
                return;
            }
        } else {
            this.handleError(new Error(`Unknown request: "${addr}"`), resp);
        }
    }
    /** For running the server */
    public run(port: number) {
        const server = http.createServer(this.withBody((req, resp) => {

            // get the HTTP method, path and body of the request
            // let method = req.method;
            const addr = req.url;

            logger.logger().debug(this.log_prefix + `Handling ${req.method} ${addr}`);
            if (this.routes.has(addr)) {
                const rec = this.routes.get(addr);
                const stat = fs.statSync(rec.local_path);
                resp.writeHead(200, { "Content-Type": rec.mime, "Content-Length": stat.size });
                const readStream = fs.createReadStream(rec.local_path);
                readStream.pipe(resp);
            } else if (this.handlers.has(addr)) {
                let data = null;
                try {
                    data = JSON.parse(req.body);
                } catch (e) {
                    this.handleError(e, resp);
                    return;
                }
                logger.logger().debug(this.log_prefix + "Handling " + req.body);
                try {
                    this.handlers.get(addr)(data, (err, data_inner) => {
                        if (err) {
                            return this.handleError(err, resp);
                        }
                        this.handleResponse(data_inner, resp);
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
                logger.logger().error(this.log_prefix + "Error while starting server on port " + port);
                logger.logger().exception(err);
            } else {
                logger.logger().important(this.log_prefix + "Server running on port " + port);
            }
        });
    }

    // Utility function that reads requests body
    private withBody(handler: IHandler): IHandler {
        return (req, resp) => {
            let input = "";
            req.on("data", chunk => { input += chunk; });
            req.on("end", () => { req.body = input; handler(req, resp); });
        };
    }

    // Utility function for returning response
    private handleResponse(result: any, response: http.ServerResponse) {
        logger.logger().debug(this.log_prefix + "Sending response " + JSON.stringify(result));
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(result || {}));
    }

    // Utility function for returning error response
    private handleError(error: Error, response: http.ServerResponse) {
        logger.logger().error(this.log_prefix + "Sending ERROR " + error.message);
        logger.logger().exception(error);
        response.writeHead(500);
        response.end(error.message);
    }
}
