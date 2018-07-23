import * as async from "async";

import * as intf from "../topology_interfaces";

/** This class transforms input object
 * into predefined format for export. Single transformation. */
export class TransformHelper {

    private compiled: string[][];

    constructor(output_template: string) {
        this.compiled = [];
        this.precompile(output_template, []);
    }

    /**
     * Main method, transforms given object into result
     * using predefined transformation.
     * @param data Input data
     */
    transform(data: any): any {
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
                } else {
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
    private precompile(template: any, prefix_array: string[]): void {
        let fields = Object.getOwnPropertyNames(template);
        for (let field of fields) {
            let loc = prefix_array.slice(0);
            loc.push(field);
            let val = template[field];
            if (typeof val === 'object') {
                this.precompile(val, loc);
            } else {
                let parts = val.split(".");
                this.compiled.push([loc, parts]);
            }
        }
    }
}


/** This bolt transforms incoming messages
 * into predefined format. */
export class TransformBolt implements intf.Bolt {

    private onEmit: intf.BoltEmitCallback;
    private transform: TransformHelper[];

    constructor() {
        this.onEmit = null;
        this.transform = null;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
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

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void {
        async.each(
            this.transform,
            (item: TransformHelper, xcallback) => {
                let result = item.transform(data);
                this.onEmit(result, stream_id, xcallback);
            },
            callback
        );
    }
}
