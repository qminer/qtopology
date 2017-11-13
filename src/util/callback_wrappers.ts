import * as intf from "../topology_interfaces";
import * as log from "../util/logger";

/** helper function that wraps a callback with try/catch and logs an error
 * if the callback threw an exception.
*/
export function tryCallback(callback: intf.SimpleCallback): intf.SimpleCallback {
    if (callback == undefined) {
        return (err?: Error) => {
            if (err) {
                log.logger().exception(err);
            }
        }
    }
    return (err?: Error) => {
        try {
            return callback(err);
        } catch (e) {
            log.logger().error("THIS SHOULD NOT HAPPEN: exception THROWN in callback!");
            log.logger().exception(e);
        }
    }
}