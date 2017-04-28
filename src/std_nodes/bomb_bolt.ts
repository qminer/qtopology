import * as intf from "../topology_interfaces";

/** This bolt explodes after predefined time interval. 
 * Primarily used for testing.
*/
export class BombBolt implements intf.Bolt {

    private name: string;
    private explode_after: number;
    private started_at: number;
    private onEmit: intf.BoltEmitCallback;

    constructor() {
        this.name = null;
        this.onEmit = null;
        this.explode_after = null;
        this.started_at = null;
    }

    init(name: string, config: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.explode_after = config.explode_after || 10 * 1000;
        this.started_at = Date.now();
        callback();
    }

    heartbeat() {
        if (Date.now() - this.started_at >= this.explode_after) {
            console.log("Bomb about to explode");
            eval("this.someBadName();");
        }
    }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        this.onEmit(data, stream_id, callback);
    }
}
