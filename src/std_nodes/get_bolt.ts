import * as intf from "../topology_interfaces";
import * as rest from "node-rest-client";

/** This bolt sends GET request to specified url
 * and forwards the result.
 */
export class GetBolt implements intf.IBolt {

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
        const url = this.fixed_url || data.url;
        const req = this.client.get(
            url,
            (new_data, response) => {
                this.onEmit({ body: new_data.toString() }, null, callback);
            });
        req.on("error", err => {
            callback(err);
        });
    }
}
