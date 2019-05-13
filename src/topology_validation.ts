import * as jsch from "jsonschema";
import * as intf from "./topology_interfaces";

/** Utility function for validating given JSON */
export function validate(options: intf.IValidationOptions) {
    const { config, exitOnError, throwOnError } = options;
    const schema = require("../resources/topology_config_schema.json");
    const v = new jsch.Validator();
    const validation_result = v.validate(config, schema);
    if (validation_result.errors.length > 0) {
        if (exitOnError) {
            console.error("Errors while parsing topology schema:");
            for (const error of validation_result.errors) {
                console.error(error.property + " " + error.message);
            }
            process.exit(1);
        }
        if (throwOnError) {
            let msg = "";
            for (const error of validation_result.errors) {
                msg += (error.property + " " + error.message) + "\n";
            }
            throw new Error(msg);
        }
        return validation_result.errors;
    } else {
        return false;
    }
}
