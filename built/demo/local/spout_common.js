"use strict";
var DataGenerator = (function () {
    function DataGenerator() {
        this._enabled = false;
        this._data = [];
    }
    DataGenerator.prototype.enable = function () {
        this._enabled = true;
    };
    DataGenerator.prototype.disable = function () {
        this._enabled = false;
    };
    DataGenerator.prototype.next = function () {
        if (!this._enabled) {
            return false;
        }
        if (this._data.length === 0) {
            this._data = [];
            for (var i = 0; i < 15; i++) {
                this._data.push({ a: i });
            }
            return null;
        }
        else {
            return this._data.pop();
        }
    };
    return DataGenerator;
}());
var MySpout = (function () {
    function MySpout(context) {
        this._name = null;
        this._context = context;
        this._prefix = "";
        this._generator = new DataGenerator();
        this._waiting_for_ack = false;
    }
    MySpout.prototype.init = function (name, config, callback) {
        this._name = name;
        this._prefix = "[InprocSpout " + this._name + "]";
        console.log(this._prefix, "Inside init:", config);
        callback();
    };
    MySpout.prototype.heartbeat = function () {
        console.log(this._prefix, "Inside heartbeat. context=", this._context);
    };
    MySpout.prototype.shutdown = function (callback) {
        console.log(this._prefix, "Shutting down gracefully.");
        callback();
    };
    MySpout.prototype.run = function () {
        console.log(this._prefix, "Inside run");
        this._generator.enable();
    };
    MySpout.prototype.pause = function () {
        console.log(this._prefix, "Inside pause");
        this._generator.disable();
    };
    MySpout.prototype.next = function (callback) {
        var _this = this;
        console.log(this._prefix, "Inside next");
        if (this._waiting_for_ack) {
            return callback(null, null, null); // no data
        }
        var data = this._generator.next();
        this._waiting_for_ack = (data !== null);
        callback(null, data, null, function (err, xcallback) {
            _this._waiting_for_ack = false;
            if (xcallback) {
                xcallback();
            }
        });
    };
    return MySpout;
}());
////////////////////////////////////////////////////////////////////////////////
exports.MySpout = MySpout;
