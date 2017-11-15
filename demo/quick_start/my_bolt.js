"use strict";

class MyBolt {

    constructor() {
        this._name = null;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        // use other fields from config to control your execution
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state
        callback();
    }

    receive(data, stream_id, callback) {
        // process incoming data
        // possible emit new data, using this._onEmit
        console.log(data, stream_id);
        callback();
    }
}

exports.create = function () { return new MyBolt(); };
/*
// alternatively, one could have several bolts in single file.
// in that case, "subtype" attribute of the bolt declaration would be 
// sent into create method and we could use it to choose appropriate implementation.
exports.create = function (subtype) {
    if (subtype == "subtype1") return new MyOtherBolt();
    return new MyBolt();
};
*/