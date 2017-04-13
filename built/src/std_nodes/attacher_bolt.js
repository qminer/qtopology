"use strict";
/** This bolt attaches fixed fields to incoming messages
 * and sends them forward. */
var AttacherBolt = (function () {
    function AttacherBolt() {
        this._name = null;
        this._onEmit = null;
        this._matcher = null;
        this._extra_fields = null;
    }
    AttacherBolt.prototype.init = function (name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    };
    AttacherBolt.prototype.heartbeat = function () { };
    AttacherBolt.prototype.shutdown = function (callback) {
        callback();
    };
    AttacherBolt.prototype.receive = function (data, stream_id, callback) {
        for (var f in this._extra_fields) {
            if (this._extra_fields.hasOwnProperty(f)) {
                data[f] = this._extra_fields[f];
            }
        }
        this._onEmit(data, stream_id, callback);
    };
    return AttacherBolt;
}());
////////////////////////////////////////////////////////////////////////////////
exports.AttacherBolt = AttacherBolt;
