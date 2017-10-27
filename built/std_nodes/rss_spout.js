"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rest = require("node-rest-client");
const log = require("../util/logger");
/** This spout periodically checks specified RSS feed and emits all items. */
class RssSpout {
    constructor() {
        this.tuples = [];
        this.should_run = false;
    }
    init(name, config, context, callback) {
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
        if (Date.now() >= this.next_call_after) {
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
    shutdown(callback) {
        callback();
    }
    run() {
        this.should_run = true;
    }
    pause() {
        this.should_run = false;
    }
    next(callback) {
        if (this.tuples.length == 0) {
            return callback(null, null, null);
        }
        let data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        callback(null, data, this.stream_id);
    }
}
exports.RssSpout = RssSpout;
//# sourceMappingURL=rss_spout.js.map