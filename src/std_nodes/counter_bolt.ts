import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

/** This bolt counts incoming data and outputs statistics
 * to console and emits it as message to listeners.
 */
export class CounterBolt implements intf.IBolt {

    private name: string;
    private prefix: string;
    private timeout: number;
    private last_output: number;
    private counter: number;
    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.name = null;
        this.onEmit = null;
        this.prefix = "";
        this.counter = 0;
        this.last_output = Date.now();
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.prefix = `[${this.name}]`;
        if (config.prefix) {
            this.prefix += ` ${config.prefix}`;
        }
        this.timeout = config.timeout;
        callback();
    }

    public heartbeat() {
        const d = Date.now();
        if (d >= this.last_output + this.timeout) {
            const sec = Math.round(d - this.last_output) / 1000;
            log.logger().log(`${this.prefix} processed ${this.counter} in ${sec} sec`);
            const msg = {
                counter: this.counter,
                period: sec,
                ts: new Date()
            };
            this.counter = 0;
            this.last_output = d;
            this.onEmit(msg, null, () => {
                // no-op
            });
        }
    }

    public shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        this.counter++;
        this.onEmit(data, stream_id, callback);
    }
}
