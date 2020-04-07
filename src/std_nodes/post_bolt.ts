import * as intf from "../topology_interfaces";
import * as rest from "../distributed/http_based/rest_client";

/** This bolt sends POST request to specified url (fixed or provided inside data)
 * and forwards the request.
 */
export class PostBolt implements intf.IBolt {

    private fixed_url: string;
    private client: rest.IApiClient;
    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.onEmit = null;
        this.fixed_url = null;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.fixed_url = config.url;
        this.client = rest.create({});
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
        let args = data;
        if (!this.fixed_url) {
            url = data.url;
            args = data.body;
        }
        this.client.post(url, args)
            .then(res => this.onEmit({ body: res.data }, null, callback))
            .catch(err => callback(err));
    }
}
