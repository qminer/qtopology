"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This bolt attaches fixed fields to incoming messages
 * and sends them forward. */
var AttacherBolt = (function () {
    function AttacherBolt() {
        this.name = null;
        this.onEmit = null;
        this.extra_fields = null;
    }
    AttacherBolt.prototype.init = function (name, config, callback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    };
    AttacherBolt.prototype.heartbeat = function () { };
    AttacherBolt.prototype.shutdown = function (callback) {
        callback();
    };
    AttacherBolt.prototype.receive = function (data, stream_id, callback) {
        for (var f in this.extra_fields) {
            if (this.extra_fields.hasOwnProperty(f)) {
                data[f] = this.extra_fields[f];
            }
        }
        this.onEmit(data, stream_id, callback);
    };
    return AttacherBolt;
}());
exports.AttacherBolt = AttacherBolt;
