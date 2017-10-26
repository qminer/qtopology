import * as intf from "../topology_interfaces";
import * as rest from 'node-rest-client';

/** This bolt sends POST request to specified url (fixed or provided inside data)
 * and forwards the request. */
export class PostBolt implements intf.Bolt  {

    private name: string;
    private fixed_url: string;
    private client: rest.Client;
    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.name = null;
        this.onEmit = null;
        this.fixed_url = null;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
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
