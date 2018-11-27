import * as intf from "../topology_interfaces";
import * as async from "async";
import * as pm from "../util/pattern_matcher";

/** This bolt routs incoming messages based on provided
 * queries and sends them forward using mapped stream ids.
 */
export class RouterBolt implements intf.IBolt {

    private matchers: any[];
    private onEmit: intf.BoltEmitCallback;

    /** Simple constructor */
    constructor() {
        this.onEmit = null;
        this.matchers = [];
    }

    /** Initializes routing patterns */
    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        for (const stream_id in config.routes) {
            if (config.routes.hasOwnProperty(stream_id)) {
                const filter = config.routes[stream_id];
                this.matchers.push({
                    matcher: new pm.PaternMatcher(filter),
                    stream_id
                });
            }
        }
        callback();
    }

    public heartbeat() {
        // no-op
    }

    public shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        const tasks = [];
        for (const item of this.matchers) {
            if (item.matcher.isMatch(data)) {
                /* jshint loopfunc:true */
                tasks.push(xcallback => {
                    this.onEmit(data, item.stream_id, xcallback);
                });
            }
        }
        async.parallel(tasks, callback);
    }
}
