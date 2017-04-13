import * as pm from "../util/pattern_matcher";
/////////////////////////////////////////////////////////////////////////////
/** This bolt filters incoming messages based on provided
 * filter and sends them forward. */
export class FilterBolt {
    constructor() {
        this.name = null;
        this.onEmit = null;
        this.matcher = null;
    }
    /** Initializes filtering pattern */
    init(name, config, callback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.matcher = new pm.PaternMatcher(config.filter);
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        if (this.matcher.isMatch(data)) {
            this.onEmit(data, stream_id, callback);
        }
        else {
            callback();
        }
    }
}
