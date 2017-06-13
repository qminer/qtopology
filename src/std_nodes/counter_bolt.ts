import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

/** This bolt just writes all incoming data to console. */
export class CounterBolt implements intf.Bolt {

    private name: string;
    private prefix: string;
    private timeout: number;
    private last_output: number;
    private counter: number;

    constructor() {
        this.name = null;
        this.prefix = "";
        this.counter = 0;
        this.last_output = Date.now();
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.prefix = `[${this.name}]`;
        this.timeout = config.timeout;
        callback();
    }

    heartbeat() {
        let d = Date.now();
        if (d >= this.last_output + this.timeout) {
            let sec = Math.round(d - this.last_output) / 1000;
            log.logger().log(`${this.prefix} processed=${this.counter} in ${sec} sec`);
            this.counter = 0;
            this.last_output = d;
        }
    }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        this.counter++;
        callback();
    }
}
