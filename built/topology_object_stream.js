"use strict";
const EventEmitter = require('events');
/////////////////////////////////////////////////////////////////////////////////////
class ObjectDeserializeStream extends EventEmitter {
    constructor(stream) {
        super();
        let buffer = '';
        let self = this;
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
    }
}
class ObjectSerializeStream extends EventEmitter {
    constructor(stream) {
        super();
        var self = this;
        this.write = function (obj) {
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
        this.end = function () {
            try {
                stream.end();
            }
            catch (err) {
                this.emit('error', err);
            }
        };
        // for http://nodejs.org/api/stream.html#stream_event_drain
        // http://nodejs.org/api/events.html#events_emitter_once_event_listener
        this.once = function (name, fn) {
            stream.once(name, fn);
        };
        stream.on('error', function (err) { self.emit('error', err); });
        stream.on('drain', function () { self.emit('drain'); });
        stream.on('finish', function () { self.emit('finish'); });
        stream.on('pipe', function (src) { self.emit('pipe', src); });
        stream.on('unpipe', function (src) { self.emit('unpipe', src); });
    }
}
class ObjectStream extends EventEmitter {
    constructor(readstream, writestream) {
        super();
        writestream = writestream || readstream;
        var self = this;
        var input = new ObjectDeserializeStream(readstream);
        input.on('data', function (data) { self.emit('data', data); });
        input.on('error', function (err) { self.emit('error', err); });
        input.on('end', function () { self.emit('end'); });
        var output = new ObjectSerializeStream(writestream);
        output.on('close', function () { self.emit('close'); });
        output.on('error', function (err) { self.emit('error', err); });
        output.on('drain', function () { self.emit('drain'); });
        this.write = function (obj) {
            if (writestream.writable) {
                output.write(obj);
            }
        };
        this.end = function () { output.end(); };
    }
}
/////////////////////////////////////////////////////////////////////////////////////
module.exports = {
    createStream: function (readstream, writestream) { return new ObjectStream(readstream, writestream); },
    createSerializeStream: function (stream) { return new ObjectSerializeStream(stream); },
    createDeserializeStream: function (stream) { return new ObjectDeserializeStream(stream); }
};
