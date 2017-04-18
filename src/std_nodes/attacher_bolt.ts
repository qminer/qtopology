import * as intf from "../topology_interfaces";

/** This bolt attaches fixed fields to incoming messages
 * and sends them forward. */
export class AttacherBolt implements intf.Bolt {

    private name: string;
    private extra_fields: any;
    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.name = null;
        this.onEmit = null;
        this.extra_fields = null;
    }

    init(name: string, config: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        for (let f in this.extra_fields) {
            if (this.extra_fields.hasOwnProperty(f)) {
                data[f] = this.extra_fields[f];
            }
        }
        this.onEmit(data, stream_id, callback);
    }
}
