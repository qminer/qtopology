/** This bolt just writes all incoming data to console. */
export class ConsoleBolt {
    constructor() {
        this.name = null;
        this.prefix = "";
        this.onEmit = null;
    }
    init(name, config, callback) {
        this.name = name;
        this.prefix = `[InprocBolt ${this.name}]`;
        this.onEmit = config.onEmit;
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        console.log(this.prefix, "Inside receive", data, "stream_id=" + stream_id);
        this.onEmit(data, stream_id, callback);
    }
}
