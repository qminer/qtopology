import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

/** This bolt just writes all incoming data to console. */
export class ConsoleBolt implements intf.Bolt {

    private name: string;
    private prefix: string;
    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.name = null;
        this.prefix = "";
        this.onEmit = null;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.prefix = `[${this.name}]`;
        this.onEmit = config.onEmit;
        callback();
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        log.logger().log(`${this.prefix} [stream_id=${stream_id}] ${JSON.stringify(data)}`);
        this.onEmit(data, stream_id, callback);
    }
}
