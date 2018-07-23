"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
/** This class transforms input object
 * into predefined format for export. Single transformation. */
class TransformHelper {
    constructor(output_template) {
        this.compiled = [];
        this.precompile(output_template, []);
    }
    /**
     * Main method, transforms given object into result
     * using predefined transformation.
     * @param data Input data
     */
    transform(data) {
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
        return result;
    }
    /**
     * Precompiles template into executable steps
     * @param template Template definition
     * @param prefix_array List of transformation steps
     */
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
exports.TransformHelper = TransformHelper;
/** This bolt transforms incoming messages
 * into predefined format. */
class TransformBolt {
    constructor() {
        this.onEmit = null;
        this.transform = null;
    }
    init(name, config, context, callback) {
        this.onEmit = config.onEmit;
        let output_template = JSON.parse(JSON.stringify(config.output_template || {}));
        if (!Array.isArray(output_template)) {
            output_template = [output_template];
        }
        this.transform = [];
        for (let ot of output_template) {
            this.transform.push(new TransformHelper(ot));
        }
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        async.each(this.transform, (item, xcallback) => {
            let result = item.transform(data);
            this.onEmit(result, stream_id, xcallback);
        }, callback);
    }
}
exports.TransformBolt = TransformBolt;
//# sourceMappingURL=transform_bolt.js.map