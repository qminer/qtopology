import * as stream from "stream";
import * as fs from "fs";

////////////////////////////////////////////////////////////////////////////

/** This class is stream-transforming object that can be piped.
 * It splits input data into lines and emits them one-by-one.
 */
export class Liner extends stream.Transform {

    private lastLineData: string;

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

export interface Parser {
    addLine(line: string);
}

export function importFileByLine(fname: string, line_parser: Parser, callback?: () => void) {
    let liner_obj = new Liner();
    let source = fs.createReadStream(fname);
    source.pipe(liner_obj);
    liner_obj.on("readable", () => {
        let chunk = liner_obj.read();
        while (chunk) {
            line_parser.addLine(chunk);
            chunk = liner_obj.read();
        }
    })
    source.on("close", () => {
        if (callback) {
            callback();
        }
    });
}
