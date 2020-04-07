import * as intf from "../topology_interfaces";
import * as rest from "../distributed/http_based/rest_client";
import * as log from "../util/logger";

/** This spout periodically checks specified RSS feed and emits all items. */
export class RssSpout implements intf.ISpout {

    private name: string;
    private stream_id: string;
    private url: string;
    private logging_prefix: string;
    private repeat: number;
    private should_run: boolean;
    private tuples: any[];
    private next_call_after: number;
    private client: rest.IApiClient;

    constructor() {
        this.tuples = [];
        this.should_run = false;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.logging_prefix = `[RssSpout ${this.name}] `;
        this.stream_id = config.stream_id;
        this.url = config.url;
        this.repeat = config.repeat || 10 * 60 * 1000;
        this.next_call_after = Date.now() - 10;
        this.client = rest.create({});
        callback();
    }

    public heartbeat() {
        if (Date.now() >= this.next_call_after && this.should_run) {
            log.logger().debug(this.logging_prefix + "Starting RSS crawl: " + this.url);
            this.client.get(this.url)
                .then(res => {
                    for (const item of res.data.rss.channel.item) {
                        this.tuples.push(item);
                    }
                    this.next_call_after = Date.now() + this.repeat;
                })
                .catch(() => {
                    // do nothing
                });
        }
    }

    public shutdown(callback: intf.SimpleCallback) {
        this.should_run = false;
        callback();
    }

    public run() {
        this.should_run = true;
    }

    public pause() {
        this.should_run = false;
    }

    public next(callback: intf.SpoutNextCallback) {
        if (!this.should_run) {
            return callback(null, null, null);
        }
        if (this.tuples.length == 0) {
            return callback(null, null, null);
        }
        const data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        callback(null, data, this.stream_id);
    }
}
