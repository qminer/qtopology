"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream = require("stream");
const fs = require("fs");
////////////////////////////////////////////////////////////////////////////
/** This class is stream-transforming object that can be piped.
 * It splits input data into lines and emits them one-by-one.
 */
class Liner extends stream.Transform {
    constructor() {
        super({ objectMode: true });
    }
    // split lines and send them one-by-one
    _transform(chunk, encoding, done) {
        let data = chunk.toString();
        if (this.lastLineData) {
            data = this.lastLineData + data;
        }
        let lines = data.split('\n');
        this.lastLineData = lines.splice(lines.length - 1, 1)[0];
        lines.forEach(this.push.bind(this));
        done();
    }
    // flush any left-overs
    _flush(done) {
        if (this.lastLineData) {
            this.push(this.lastLineData);
        }
        this.lastLineData = null;
        done();
    }
}
exports.Liner = Liner;
function importFileByLine(fname, line_parser, callback) {
    let liner_obj = new Liner();
    let source = fs.createReadStream(fname);
    source.pipe(liner_obj);
    liner_obj.on('readable', function () {
        let chunk = liner_obj.read();
        while (chunk) {
            line_parser.addLine(chunk);
            chunk = liner_obj.read();
        }
    });
    source.on("close", function () {
        if (callback) {
            callback();
        }
    });
}
exports.importFileByLine = importFileByLine;
//# sourceMappingURL=stream_helpers.js.map