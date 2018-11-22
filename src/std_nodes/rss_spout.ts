import * as intf from "../topology_interfaces";
import * as rest from 'node-rest-client';
import * as log from "../util/logger";

/** This spout periodically checks specified RSS feed and emits all items. */
export class RssSpout implements intf.Spout {

    private name: string;
    private stream_id: string;
    private url: string;
    private logging_prefix: string;
    private repeat: number;
    private should_run: boolean;
    private tuples: any[];
    private next_call_after: number;
    private client: rest.Client;

    constructor() {
        this.tuples = [];
        this.should_run = false;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.logging_prefix = `[RssSpout ${this.name}] `;
        this.stream_id = config.stream_id;
        this.url = config.url;
        this.repeat = config.repeat || 10 * 60 * 1000;
        this.next_call_after = Date.now() - 10;
        this.client = new rest.Client();
        callback();
    }

    heartbeat() {
        if (Date.now() >= this.next_call_after && this.should_run) {
            let self = this;
            log.logger().debug(this.logging_prefix + "Starting RSS crawl: " + self.url);
            self.client.get(self.url, (new_data, response) => {
                for (let item of new_data.rss.channel.item) {
                    self.tuples.push(item);
                }
                self.next_call_after = Date.now() + self.repeat;
            });
        }
    }

    shutdown(callback: intf.SimpleCallback) {
        this.should_run = false;
        callback();
    }

    run() {
        this.should_run = true;
    }

    pause() {
        this.should_run = false;
    }

    next(callback: intf.SpoutNextCallback) {
        if (!this.should_run) {
            return callback(null, null, null);
        }
        if (this.tuples.length == 0) {
            return callback(null, null, null);
        }
        let data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        callback(null, data, this.stream_id);
    }
}
