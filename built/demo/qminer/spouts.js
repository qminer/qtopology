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
            for (var i = 0; i < 500; i++) {
                this._data.push({
                    a: Math.sin(i),
                    b: Math.cos(i)
                });
            }
            return null;
        }
        else {
            return this._data.pop();
        }
    };
    return DataGenerator;
}());
var DummySpout = (function () {
    function DummySpout() {
        this._name = null;
        this._prefix = "";
        this._generator = new DataGenerator();
    }
    DummySpout.prototype.init = function (name, config, callback) {
        this._name = name;
        this._prefix = "[DummySpout " + this._name + "]";
        console.log(this._prefix, "Inside init:", config);
        callback();
    };
    DummySpout.prototype.heartbeat = function () {
        console.log(this._prefix, "Inside heartbeat.");
    };
    DummySpout.prototype.shutdown = function (callback) {
        console.log(this._prefix, "Shutting down gracefully.");
        callback();
    };
    DummySpout.prototype.run = function () {
        //console.log(this._prefix, "Inside run");
        this._generator.enable();
    };
    DummySpout.prototype.pause = function () {
        //console.log(this._prefix, "Inside pause");
        this._generator.disable();
    };
    DummySpout.prototype.next = function (callback) {
        //console.log(this._prefix, "Inside next");
        var data = this._generator.next();
        callback(null, data, null);
    };
    return DummySpout;
}());
////////////////////////////////////////////////////////////////////////////////
exports.DummySpout = DummySpout;
