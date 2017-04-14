"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This bolt just writes all incoming data to console. */
var ConsoleBolt = (function () {
    function ConsoleBolt() {
        this.name = null;
        this.prefix = "";
        this.onEmit = null;
    }
    ConsoleBolt.prototype.init = function (name, config, callback) {
        this.name = name;
        this.prefix = "[InprocBolt " + this.name + "]";
        this.onEmit = config.onEmit;
        callback();
    };
    ConsoleBolt.prototype.heartbeat = function () { };
    ConsoleBolt.prototype.shutdown = function (callback) {
        callback();
    };
    ConsoleBolt.prototype.receive = function (data, stream_id, callback) {
        console.log(this.prefix, "Inside receive", data, "stream_id=" + stream_id);
        this.onEmit(data, stream_id, callback);
    };
    return ConsoleBolt;
}());
exports.ConsoleBolt = ConsoleBolt;
