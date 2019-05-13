import * as intf from "../topology_interfaces";
import * as rest from "node-rest-client";

/** This bolt sends POST request to specified url (fixed or provided inside data)
 * and forwards the request.
 */
export class PostBolt implements intf.IBolt {

    private fixed_url: string;
    private client: rest.Client;
    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.onEmit = null;
        this.fixed_url = null;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.fixed_url = config.url;
        this.client = new rest.Client();
        callback();
    }

    public heartbeat() {
        // no-op
    }

    public shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        let url = this.fixed_url;
        const args = { data, headers: { "Content-Type": "application/json" } };
        if (!this.fixed_url) {
            url = data.url;
            args.data = data.body;
        }
        const req = this.client.post(url, args, (new_data, response) => {
            this.onEmit({ body: new_data }, null, callback);
        });
        req.on("error", err => {
            callback(err);
        });
    }
}
