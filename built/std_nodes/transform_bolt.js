"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This bolt transforms incoming messages
 * into predefined format. */
class TransformBolt {
    constructor() {
        this.onEmit = null;
        this.compiled = [];
    }
    init(name, config, context, callback) {
        this.onEmit = config.onEmit;
        var output_template = JSON.parse(JSON.stringify(config.output_template || {}));
        this.precompile(output_template, []);
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        let result = {};
        // execute precompiled parsing and transformation
        for (let r of this.compiled) {
            let target = result;
            for (let i = 0; i < r[0].length - 1; i++) {
                let f = r[0][i];
                if (!target[f]) {
                    target[f] = {};
                }
                target = target[f];
            }
            let source = data;
            for (let i = 0; i < r[1].length - 1; i++) {
                let f = r[1][i];
                if (source[f]) {
                    source = source[f];
                }
                else {
                    source = null;
                    break;
                }
            }
            if (source) {
                target[r[0][r[0].length - 1]] = source[r[1][r[1].length - 1]];
            }
        }
        this.onEmit(result, stream_id, callback);
    }
    precompile(template, prefix_array) {
        let fields = Object.getOwnPropertyNames(template);
        for (let field of fields) {
            let loc = prefix_array.slice(0);
            loc.push(field);
            let val = template[field];
            if (typeof val === 'object') {
                this.precompile(val, loc);
            }
            else {
                let parts = val.split(".");
                this.compiled.push([loc, parts]);
            }
        }
    }
}
exports.TransformBolt = TransformBolt;
//# sourceMappingURL=transform_bolt.js.map