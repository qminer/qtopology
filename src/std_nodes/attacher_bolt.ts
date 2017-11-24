import * as intf from "../topology_interfaces";
import * as oo from "../util/object_override";

/** This bolt attaches fixed fields to incoming messages
 * and sends them forward. */
export class AttacherBolt implements intf.Bolt {

    private extra_fields: any;
    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.onEmit = null;
        this.extra_fields = null;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        oo.overrideObject(data, this.extra_fields, false);
        this.onEmit(data, stream_id, callback);
    }
}
