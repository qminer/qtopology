"use strict";
/////////////////////////////////////////////////////////////////////////////
/** This bolt just writes all incoming data to console. */
var ConsoleBolt = (function () {
    function ConsoleBolt() {
        this._name = null;
        this._prefix = "";
        this._onEmit = null;
    }
    ConsoleBolt.prototype.init = function (name, config, callback) {
        this._name = name;
        this._prefix = "[InprocBolt " + this._name + "]";
        this._onEmit = config.onEmit;
        callback();
    };
    ConsoleBolt.prototype.heartbeat = function () { };
    ConsoleBolt.prototype.shutdown = function (callback) {
        callback();
    };
    ConsoleBolt.prototype.receive = function (data, stream_id, callback) {
        console.log(this._prefix, "Inside receive", data, "stream_id=" + stream_id);
        this._onEmit(data, stream_id, callback);
    };
    return ConsoleBolt;
}());
////////////////////////////////////////////////////////////////////////////////
exports.ConsoleBolt = ConsoleBolt;
