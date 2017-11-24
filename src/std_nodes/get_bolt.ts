import * as intf from "../topology_interfaces";
import * as rest from 'node-rest-client';

/** This bolt sends GET request to specified url
 * and forwards the result.
 * */
export class GetBolt implements intf.Bolt {

    private fixed_url: string;
    private client: rest.Client;
    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.onEmit = null;
        this.fixed_url = null;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.fixed_url = config.url;
        this.client = new rest.Client();
        callback();
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        let self = this;
        let url = self.fixed_url || data.url;
        let req = self.client.get(
            url,
            (new_data, response) => {
                self.onEmit({ body: new_data.toString() }, null, callback);
            });
        req.on('error', function (err) {
            callback(err);
        });
    }
}
