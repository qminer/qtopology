"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rest = require("node-rest-client");
/** This bolt sends GET request to specified url
 * and forwards the result.
 * */
class GetBolt {
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
        if (self.fixed_url) {
            let req = self.client.get(self.fixed_url, (new_data, response) => {
                self.onEmit({ body: new_data }, null, callback);
            });
            req.on('error', function (err) {
                callback(err);
            });
        }
        else {
            let req = self.client.get(data.url, (new_data, response) => {
                self.onEmit({ body: new_data }, null, callback);
            });
            req.on('error', function (err) {
                callback(err);
            });
        }
    }
}
exports.GetBolt = GetBolt;
//# sourceMappingURL=get_bolt.js.map