"use strict";

/** Simple class for collecting telemetry statistics for call durations */
class Telemetry {

    constructor() {
        this._cnt = 0;
        this._avg = 0;
        this._min = 0;
        this._max = 0;
    }

    add(duration) {
        if (this._cnt === 0) {
            this._avg = duration;
            this._cnt = 1;
            this._min = duration;
            this._max = duration;
        } else {
            let tc = this._cnt;
            let tc1 = this._cnt + 1;
            this._avg = this._avg * (tc / tc1) + duration / tc1;
            this._cnt++;
            this._min = Math.min(this._min, duration);
            this._max = Math.max(this._max, duration);
        }
    }

    reset() {
        this._cnt = 0;
        this._avg = 0;
        this._min = 0;
        this._max = 0;
    }

    get() {
        return {
            cnt: this._cnt,
            avg: this._avg
        };
    }
}

exports.Telemetry = Telemetry;
