"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rest = require("node-rest-client");
/** This bolt sends GET request to specified url
 * and forwards the result.
 * */
class GetBolt {
    constructor() {
        this.onEmit = null;
        this.fixed_url = null;
    }
    init(name, config, context, callback) {
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
        let url = self.fixed_url || data.url;
        let req = self.client.get(url, (new_data, response) => {
            self.onEmit({ body: new_data.toString() }, null, callback);
        });
        req.on('error', function (err) {
            callback(err);
        });
    }
}
exports.GetBolt = GetBolt;
//# sourceMappingURL=get_bolt.js.map