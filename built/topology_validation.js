"use strict";
var fs = require("fs");
var Validator = require("jsonschema").Validator;
/////////////////////////////////////////////////////////////////////////////
/**
 *
 * @param {Object} options - validation options
 * @param {Object} options.config - configuration to validate
 * @param {boolean} options.exitOnError - If true, in case of errors the validator stops the process
 * @param {boolean} options.throwOnError - If true, in case of errors the validator throws an exception
 */
function validate(options) {
    var config = options.config, exitOnError = options.exitOnError, throwOnError = options.throwOnError;
    var schema = require("../src/topology_config_schema.json");
    var v = new Validator();
    var validation_result = v.validate(config, schema);
    if (validation_result.errors.length > 0) {
        if (exitOnError) {
            console.error("Errors while parsing topology schema:");
            for (var _i = 0, _a = validation_result.errors; _i < _a.length; _i++) {
                var error = _a[_i];
                console.error(error.stack || error.property + " " + error.message);
            }
            process.exit(1);
        }
        if (throwOnError) {
            var msg = "";
            for (var _b = 0, _c = validation_result.errors; _b < _c.length; _b++) {
                var error = _c[_b];
                msg += (error.stack || error.property + " " + error.message) + "\n";
            }
            throw new Error(msg);
        }
        return validation_result.errors;
    }
    else {
        return false;
    }
}
exports.validate = validate;
