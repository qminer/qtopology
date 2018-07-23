import * as intf from "../topology_interfaces";
/** This class transforms input object
 * into predefined format for export. Single transformation. */
export declare class TransformHelper {
    private compiled;
    constructor(output_template: string);
    /**
     * Main method, transforms given object into result
     * using predefined transformation.
     * @param data Input data
     */
    transform(data: any): any;
    /**
     * Precompiles template into executable steps
     * @param template Template definition
     * @param prefix_array List of transformation steps
     */
    private precompile;
}
/** This bolt transforms incoming messages
 * into predefined format. */
export declare class TransformBolt implements intf.Bolt {
    private onEmit;
    private transform;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
