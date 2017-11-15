"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require("../util/logger");
/** helper function that wraps a callback with try/catch and logs an error
 * if the callback threw an exception.
*/
function tryCallback(callback) {
    if (callback == undefined) {
        return (err) => {
            if (err) {
                log.logger().exception(err);
            }
        };
    }
    return (err) => {
        try {
            return callback(err);
        }
        catch (e) {
            log.logger().error("THIS SHOULD NOT HAPPEN: exception THROWN in callback!");
            log.logger().exception(e);
        }
    };
}
exports.tryCallback = tryCallback;
//# sourceMappingURL=callback_wrappers.js.map