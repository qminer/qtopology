"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var EventEmitter = require('events');
/////////////////////////////////////////////////////////////////////////////////////
var ObjectDeserializeStream = (function (_super) {
    __extends(ObjectDeserializeStream, _super);
    function ObjectDeserializeStream(stream) {
        var _this = _super.call(this) || this;
        var buffer = '';
        var self = _this;
        stream.on('data', function (data) {
            buffer += data.toString();
            for (var p = buffer.indexOf('\n'); p >= 0; p = buffer.indexOf('\n')) {
                var line = buffer.substring(0, p);
                if (line && line[line.length - 1] == '\r') {
                    line = line.substring(0, line.length - 1);
                }
                buffer = buffer.substring(p + 1);
                if (!line) {
                    continue;
                }
                try {
                    var obj = JSON.parse(line);
                    self.emit('data', obj);
                }
                catch (err) {
                    self.emit('error', err);
                    throw err;
                }
            }
        });
        stream.on('end', function () { self.emit('end'); });
        stream.on('close', function () { self.emit('close'); });
        stream.on('error', function (err) { self.emit('error', err); });
        return _this;
    }
    return ObjectDeserializeStream;
}(EventEmitter));
var ObjectSerializeStream = (function (_super) {
    __extends(ObjectSerializeStream, _super);
    function ObjectSerializeStream(stream) {
        var _this = _super.call(this) || this;
        var self = _this;
        _this.write = function (obj) {
            try {
                var json = JSON.stringify(obj);
                if (!stream.writable) {
                    throw "socket is invalid";
                }
                stream.write(json + '\n');
            }
            catch (err) {
                this.emit('error', err);
                throw err;
            }
        };
        _this.end = function () {
            try {
                stream.end();
            }
            catch (err) {
                this.emit('error', err);
            }
        };
        // for http://nodejs.org/api/stream.html#stream_event_drain
        // http://nodejs.org/api/events.html#events_emitter_once_event_listener
        _this.once = function (name, fn) {
            stream.once(name, fn);
        };
        stream.on('error', function (err) { self.emit('error', err); });
        stream.on('drain', function () { self.emit('drain'); });
        stream.on('finish', function () { self.emit('finish'); });
        stream.on('pipe', function (src) { self.emit('pipe', src); });
        stream.on('unpipe', function (src) { self.emit('unpipe', src); });
        return _this;
    }
    return ObjectSerializeStream;
}(EventEmitter));
var ObjectStream = (function (_super) {
    __extends(ObjectStream, _super);
    function ObjectStream(readstream, writestream) {
        var _this = _super.call(this) || this;
        writestream = writestream || readstream;
        var self = _this;
        var input = new ObjectDeserializeStream(readstream);
        input.on('data', function (data) { self.emit('data', data); });
        input.on('error', function (err) { self.emit('error', err); });
        input.on('end', function () { self.emit('end'); });
        var output = new ObjectSerializeStream(writestream);
        output.on('close', function () { self.emit('close'); });
        output.on('error', function (err) { self.emit('error', err); });
        output.on('drain', function () { self.emit('drain'); });
        _this.write = function (obj) {
            if (writestream.writable) {
                output.write(obj);
            }
        };
        _this.end = function () { output.end(); };
        return _this;
    }
    return ObjectStream;
}(EventEmitter));
/////////////////////////////////////////////////////////////////////////////////////
module.exports = {
    createStream: function (readstream, writestream) { return new ObjectStream(readstream, writestream); },
    createSerializeStream: function (stream) { return new ObjectSerializeStream(stream); },
    createDeserializeStream: function (stream) { return new ObjectDeserializeStream(stream); }
};
