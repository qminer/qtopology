"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsch = require("jsonschema");
/** Utility function for validating given JSON */
function validate(options) {
    let { config, exitOnError, throwOnError } = options;
    let schema = require("../src/topology_config_schema.json");
    let v = new jsch.Validator();
    let validation_result = v.validate(config, schema);
    if (validation_result.errors.length > 0) {
        if (exitOnError) {
            console.error("Errors while parsing topology schema:");
            for (let error of validation_result.errors) {
                console.error(error.property + " " + error.message);
            }
            process.exit(1);
        }
        if (throwOnError) {
            let msg = "";
            for (let error of validation_result.errors) {
                msg += (error.property + " " + error.message) + "\n";
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
//# sourceMappingURL=topology_validation.js.map