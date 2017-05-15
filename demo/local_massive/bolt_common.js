"use strict";

class MyBolt {

    constructor() {
        this._context = null;
        this._sum = 0;
        this._forward = true;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._context = context;
        this._onEmit = config.onEmit;
        this._forward = config.forward;
        callback();
    }

    heartbeat() {
        // this._onEmit({ sum: this._sum }, null, (err)=>{
        //     if (err) {
        //         console.log(err);
        //     }
        // });
    }

    shutdown(callback) {
        callback();
    }

    receive(data, stream_id, callback) {
        let self = this;
        if (self._context) {
            self._context.cnt++;
        }
        this._sum += data.a;
        callback();
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.MyBolt = MyBolt;
