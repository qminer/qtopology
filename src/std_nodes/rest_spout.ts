import * as intf from "../topology_interfaces";
import * as pm from "../util/pattern_matcher";
import * as http from 'http';

/** This spout receives requests (messages/data) over REST interface.
 * It assumes data is in JSON format.
 */
export class RestSpout implements intf.Spout {

    private name: string;
    private stream_id: string;
    private should_run: boolean;
    private port: number;
    private server: http.Server;
    private queue: any[];

    constructor() {
        this.name = null;
        this.port = null;
        this.stream_id = null;
        this.should_run = false;
        this.queue = [];
        this.server = null;
    }

    init(name: string, config: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.port = config.port;
        this.stream_id = config.stream_id;

        let self = this;
        this.server = http.createServer((req, res) => {
            if (self.should_run) {
                let body = [];
                req
                    .on('data', (chunk) => { body.push(chunk); })
                    .on('end', () => {
                        let body_s = Buffer.concat(body).toString();
                        res.end();
                        self.queue.push(JSON.parse(body_s));
                    });
            } else {
                res.end();
            }
        });
        self.server.on('clientError', (err, socket) => {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        self.server.listen(self.port, callback);
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        this.server.close(callback);
    }

    run() {
        this.should_run = true;
    }

    pause() {
        this.should_run = false;
    }

    next(callback: intf.SpoutNextCallback) {
        if (this.queue.length === 0) {
            return callback(null, null, null);
        }
        let data = this.queue[0];
        this.queue = this.queue.slice(1);
        callback(null, data, this.stream_id);
    }
}
