import * as intf from "../topology_interfaces";
import * as http from "http";

/** This spout receives requests (messages/data) over REST interface.
 * It assumes data is in JSON format.
 */
export class RestSpout implements intf.ISpout {

    private stream_id: string;
    private should_run: boolean;
    private port: number;
    private send_request_metadata: boolean;
    private max_queue_len: number;
    private server: http.Server;
    private queue: any[];

    constructor() {
        this.port = null;
        this.stream_id = null;
        this.should_run = false;
        this.queue = [];
        this.server = null;
        this.send_request_metadata = false;

        this.max_queue_len = 1000;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.port = config.port;
        this.stream_id = config.stream_id;
        this.max_queue_len = config.max_queue_len || this.max_queue_len;
        this.send_request_metadata = config.send_request_metadata || this.send_request_metadata;

        this.server = http.createServer((req, res) => {
            if (this.queue.length > this.max_queue_len) {
                res.statusCode = 503;
                res.statusMessage = "Server is busy";
                res.end();
            } else if (this.should_run) {
                const body = [];
                req
                    .on("data", chunk => {
                        body.push(chunk);
                    })
                    .on("end", () => {
                        const body_s = Buffer.concat(body).toString();
                        res.end();
                        const body_obj = JSON.parse(body_s);
                        if (this.send_request_metadata) {
                            // send both body and some request properties
                            this.queue.push({
                                body: body_obj,
                                request: {
                                    method: req.method,
                                    url: req.url
                                }
                            });
                        } else {
                            // send only body
                            this.queue.push(body_obj);
                        }
                    });
            } else {
                res.end();
            }
        });
        this.server.on("clientError", (err, socket) => {
            socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
        });
        this.server.listen(this.port, callback);
    }

    public heartbeat() {
        // no-op
    }

    public shutdown(callback: intf.SimpleCallback) {
        this.server.close(callback);
    }

    public run() {
        this.should_run = true;
    }

    public pause() {
        this.should_run = false;
    }

    public next(callback: intf.SpoutNextCallback) {
        if (this.queue.length === 0) {
            return callback(null, null, null);
        }
        const data = this.queue[0];
        this.queue = this.queue.slice(1);
        callback(null, data, this.stream_id);
    }
}
