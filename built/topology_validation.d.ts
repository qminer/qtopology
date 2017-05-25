import * as jsch from "jsonschema";
import * as intf from "./topology_interfaces";
/** Utility function for validating given JSON */
export declare function validate(options: intf.ValidationOptions): false | jsch.ValidationError[];
