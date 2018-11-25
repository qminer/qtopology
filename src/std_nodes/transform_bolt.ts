import * as async from "async";
import * as qewd from "qewd-transform-json";

import * as intf from "../topology_interfaces";

/** Interfal interface for different implementations */
interface ITransformHelper {
    transform(data: any): any;
}

/** This class transforms input object
 * into predefined format for export. Single transformation.
 */
export class TransformHelper implements ITransformHelper {

    private compiled: string[][];

    constructor(output_template: any) {
        this.compiled = [];
        this.precompile(output_template, []);
    }

    /**
     * Main method, transforms given object into result
     * using predefined transformation.
     * @param data Input data
     */
    public transform(data: any): any {
        const result = {};
        // execute precompiled parsing and transformation
        for (const r of this.compiled) {
            let target = result;
            for (let i = 0; i < r[0].length - 1; i++) {
                const f = r[0][i];
                if (!target[f]) {
                    target[f] = {};
                }
                target = target[f];
            }
            let source = data;
            for (let i = 0; i < r[1].length - 1; i++) {
                const f = r[1][i];
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
        const fields = Object.getOwnPropertyNames(template);
        for (const field of fields) {
            const loc = prefix_array.slice(0);
            loc.push(field);
            const val = template[field];
            if (typeof val === "object") {
                this.precompile(val, loc);
            } else {
                const parts = val.split(".");
                this.compiled.push([loc, parts]);
            }
        }
    }
}

/** This class transforms input object
 * into predefined format for export. Single transformation.
 * Uses Qewd library syntax.
 */
export class TransformHelperQewd implements ITransformHelper {

    private template: any;

    constructor(output_template: any) {
        this.template = output_template;
    }

    /**
     * Main method, transforms given object into result
     * using predefined transformation.
     * @param data Input data
     */
    public transform(data: any): any {
        const result = qewd.transform(this.template, data);
        return result;
    }
}

/** This bolt transforms incoming messages
 * into predefined format.
 */
export class TransformBolt implements intf.IBolt {

    private onEmit: intf.BoltEmitCallback;
    private transform: ITransformHelper[];

    constructor() {
        this.onEmit = null;
        this.transform = null;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        let output_template = JSON.parse(JSON.stringify(config.output_template || {}));
        if (!Array.isArray(output_template)) {
            output_template = [output_template];
        }
        this.transform = [];
        const transformQewd = config.use_qewd;

        for (const ot of output_template) {
            if (transformQewd) {
                this.transform.push(new TransformHelperQewd(ot));
            } else {
                this.transform.push(new TransformHelper(ot));
            }
        }
        callback();
    }

    public heartbeat() {
        // no-op
    }

    public shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback): void {
        async.each(
            this.transform,
            (item: TransformHelper, xcallback) => {
                const result = item.transform(data);
                this.onEmit(result, stream_id, xcallback);
            },
            callback
        );
    }
}
