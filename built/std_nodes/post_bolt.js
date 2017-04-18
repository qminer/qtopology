"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rest = require("node-rest-client");
/** This bolt sends POST request to specified url (fixed or provided inside data)
 * and forwards the request. */
class PostBolt {
    constructor() {
        this.name = null;
        this.onEmit = null;
        this.fixed_url = null;
    }
    init(name, config, callback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.fixed_url = config.url;
        this.client = new rest.Client();
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        let self = this;
        let url = this.fixed_url;
        let args = {
            data: data,
            headers: { "Content-Type": "application/json" }
        };
        if (!this.fixed_url) {
            url = data.url;
            args.data = data.body;
        }
        let req = self.client.post(url, args, (new_data, response) => {
            self.onEmit({ body: new_data }, null, callback);
        });
        req.on('error', function (err) {
            callback(err);
        });
    }
}
exports.PostBolt = PostBolt;
//# sourceMappingURL=post_bolt.js.map