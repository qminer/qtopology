"use strict";
const fs = require("fs");
const Validator = require("jsonschema").Validator;
/////////////////////////////////////////////////////////////////////////////
/**
 *
 * @param {Object} options - validation options
 * @param {Object} options.config - configuration to validate
 * @param {boolean} options.exitOnError - If true, in case of errors the validator stops the process
 * @param {boolean} options.throwOnError - If true, in case of errors the validator throws an exception
 */
function validate(options) {
    let { config, exitOnError, throwOnError } = options;
    let schema = require("./topology_config_schema.json");
    let v = new Validator();
    let validation_result = v.validate(config, schema);
    if (validation_result.errors.length > 0) {
        if (exitOnError) {
            console.error("Errors while parsing topology schema:");
            for (let error of validation_result.errors) {
                console.error(error.stack || error.property + " " + error.message);
            }
            process.exit(1);
        }
        if (throwOnError) {
            let msg = "";
            for (let error of validation_result.errors) {
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
