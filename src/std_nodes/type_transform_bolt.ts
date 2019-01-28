import * as intf from "../topology_interfaces";

/** This bolt transforms given input fields in the incoming
 * messages to either Date objects, numerics or booleans
 * and sends them forward.
 */
export class TypeTransformBolt implements intf.IBolt {

    private date_transform_fields: string[];
    private numeric_transform_fields: string[];
    private bool_transform_fields: string[];
    private onEmit: intf.BoltEmitCallback;
    private stream_id: string;
    private reuse_stream_id: boolean;

    constructor() {
        this.onEmit = null;
        this.date_transform_fields = [];
        this.bool_transform_fields = [];
        this.numeric_transform_fields = [];
        this.stream_id = null;
        this.reuse_stream_id = false;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.date_transform_fields = config.date_transform_fields || [];
        this.numeric_transform_fields = config.numeric_transform_fields || [];
        this.bool_transform_fields = config.bool_transform_fields || [];
        this.stream_id = config.stream_id;
        this.reuse_stream_id = config.reuse_stream_id;
        callback();
    }

    public heartbeat() {
        // no-op
    }

    public shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        for (const date_field of this.date_transform_fields) {
            if (data[date_field]) {
                data[date_field] = new Date(data[date_field]);
            }
        }
        for (const date_field of this.numeric_transform_fields) {
            if (data[date_field]) {
                data[date_field] = +data[date_field];
            }
        }
        for (const date_field of this.bool_transform_fields) {
            if (data[date_field]) {
                data[date_field] = (data[date_field] && data[date_field] != "false" ? true : false);
            }
        }
        this.onEmit(data, (this.reuse_stream_id ? stream_id : this.stream_id), callback);
    }
}

/** This bolt transforms given input fields in the incoming
 * messages from Date objects into numerics.
 */
export class DateToNumericTransformBolt implements intf.IBolt {

    private date_transform_fields: string[];
    private onEmit: intf.BoltEmitCallback;
    private stream_id: string;
    private reuse_stream_id: boolean;

    constructor() {
        this.onEmit = null;
        this.date_transform_fields = [];
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.date_transform_fields = config.date_transform_fields || [];
        this.stream_id = config.stream_id;
        this.reuse_stream_id = config.reuse_stream_id;
        callback();
    }

    public heartbeat() {
        // no-op
    }

    public shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        for (const date_field of this.date_transform_fields) {
            if (data[date_field]) {
                data[date_field] = (data[date_field] as Date).getTime();
            }
        }
        this.onEmit(data, (this.reuse_stream_id ? stream_id : this.stream_id), callback);
    }
}
