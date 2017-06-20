import * as intf from "../topology_interfaces";

/** This bolt transforms given date fields in incoming
 * messages from text or number into Date objects
 * and sends them forward. */
export class DateTransformBolt implements intf.Bolt {

    private date_transform_fields: string[];
    private onEmit: intf.BoltEmitCallback;
    private stream_id: string;
    private reuse_stream_id: boolean;

    constructor() {
        this.onEmit = null;
        this.date_transform_fields = [];
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.date_transform_fields = config.date_transform_fields || [];
        this.stream_id = config.stream_id;
        this.reuse_stream_id = config.reuse_stream_id;
        callback();
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        for (let date_field of this.date_transform_fields) {
            if (data[date_field]) {
                data[date_field] = new Date(data[date_field]);
            }
        }
        this.onEmit(data, (this.reuse_stream_id ? stream_id : this.stream_id), callback);
    }
}
