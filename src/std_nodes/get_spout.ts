import * as intf from "../topology_interfaces";
import * as rest from "../distributed/http_based/rest_client";

/** This spout sends GET request to the specified url in regular
 * time intervals and forwards the result.
 */
export class GetSpout implements intf.ISpout {

    private stream_id: string;
    private url: string;
    private repeat: number;
    private should_run: boolean;
    private next_tuple: any;
    private next_ts: number;
    private client: rest.IApiClient;

    constructor() {
        this.url = null;
        this.stream_id = null;
        this.repeat = null;

        this.should_run = false;
        this.next_tuple = null;
        this.next_ts = Date.now();
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.url = config.url;
        this.repeat = config.repeat;
        this.stream_id = config.stream_id;
        this.client = rest.create({});
        callback();
    }

    public heartbeat() {
        if (!this.should_run) {
            return;
        }
        if (this.next_ts < Date.now()) {
            this.client.get(this.url)
                .then(res => {
                    this.next_tuple = { body: res.data.toString() };
                    this.next_ts = Date.now() + this.repeat;
                })
                .catch(() => {
                    // do nothing
                });
        }
    }

    public shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    public run() {
        this.should_run = true;
    }

    public pause() {
        this.should_run = false;
    }

    public next(callback: intf.SpoutNextCallback) {
        const data = this.next_tuple;
        this.next_tuple = null;
        callback(null, data, this.stream_id);
    }
}
