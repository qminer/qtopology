"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Simple class for collecting telemetry statistics for call durations */
var Telemetry = (function () {
    function Telemetry(name) {
        this.cnt = 0;
        this.avg = 0;
        this.min = 0;
        this.max = 0;
        this.name = name;
    }
    Telemetry.prototype.add = function (duration) {
        if (this.cnt === 0) {
            this.avg = duration;
            this.cnt = 1;
            this.min = duration;
            this.max = duration;
        }
        else {
            var tc = this.cnt;
            var tc1 = this.cnt + 1;
            this.avg = this.avg * (tc / tc1) + duration / tc1;
            this.cnt++;
            this.min = Math.min(this.min, duration);
            this.max = Math.max(this.max, duration);
        }
    };
    Telemetry.prototype.reset = function () {
        this.cnt = 0;
        this.avg = 0;
        this.min = 0;
        this.max = 0;
    };
    Telemetry.prototype.get = function () {
        return {
            name: this.name,
            cnt: this.cnt,
            avg: this.avg
        };
    };
    return Telemetry;
}());
exports.Telemetry = Telemetry;
