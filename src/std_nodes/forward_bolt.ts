import * as intf from "../topology_interfaces";

/////////////////////////////////////////////////////////////////////////////

/** This bolt forwards all incoming messages. Can be used as stage separator.
 */
export class ForwardrBolt implements intf.IBolt {

    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.onEmit = null;
    }

    /** Initializes filtering pattern */
    public init(_name: string, config: any, _context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        callback();
    }

    public heartbeat() {
        // no-op
    }

    public shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        this.onEmit(data, stream_id, callback);
    }
}
