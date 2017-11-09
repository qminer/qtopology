import * as intf from "../topology_interfaces";
/** helper function that wraps a callback with try/catch and logs an error
 * if the callback threw an exception.
*/
export declare function tryCallback(callback: intf.SimpleCallback): intf.SimpleCallback;
