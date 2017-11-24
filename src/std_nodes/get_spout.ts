import * as intf from "../topology_interfaces";
import * as rest from 'node-rest-client';

/** This spout sends GET request to the specified url in regular
 * time intervals and forwards the result.
 * */
export class GetSpout implements intf.Spout {

    private stream_id: string;
    private url: string;
    private repeat: number;
    private should_run: boolean;
    private next_tuple: any;
    private next_ts: number;
    private client: rest.Client;

    constructor() {
        this.url = null;
        this.stream_id = null;
        this.repeat = null;

        this.should_run = false;
        this.next_tuple = null;
        this.next_ts = Date.now();
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.url = config.url;
        this.repeat = config.repeat;
        this.stream_id = config.stream_id;
        this.client = new rest.Client();
        callback();
    }

    heartbeat() {
        if (!this.should_run) {
            return;
        }
        if (this.next_ts < Date.now()) {
            let self = this;
            self.client.get(self.url, (new_data, response) => {
                self.next_tuple = { body: new_data.toString() };
                self.next_ts = Date.now() + self.repeat;
            });
        }
    }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    run() {
        this.should_run = true;
    }

    pause() {
        this.should_run = false;
    }

    next(callback: intf.SpoutNextCallback) {
        let data = this.next_tuple;
        this.next_tuple = null;
        callback(null, data, this.stream_id);
    }
}
