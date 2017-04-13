"use strict";
/** Simple class for collecting telemetry statistics for call durations */
var Telemetry = (function () {
    function Telemetry(name) {
        this._cnt = 0;
        this._avg = 0;
        this._min = 0;
        this._max = 0;
        this._name = name;
    }
    Telemetry.prototype.add = function (duration) {
        if (this._cnt === 0) {
            this._avg = duration;
            this._cnt = 1;
            this._min = duration;
            this._max = duration;
        }
        else {
            var tc = this._cnt;
            var tc1 = this._cnt + 1;
            this._avg = this._avg * (tc / tc1) + duration / tc1;
            this._cnt++;
            this._min = Math.min(this._min, duration);
            this._max = Math.max(this._max, duration);
        }
    };
    Telemetry.prototype.reset = function () {
        this._cnt = 0;
        this._avg = 0;
        this._min = 0;
        this._max = 0;
    };
    Telemetry.prototype.get = function () {
        return {
            name: this._name,
            cnt: this._cnt,
            avg: this._avg
        };
    };
    return Telemetry;
}());
exports.Telemetry = Telemetry;
