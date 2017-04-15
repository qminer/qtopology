"use strict";
const fs = require("fs");
const Validator = require("jsonschema").Validator;
const TopologyCompiler = require("../topology_compiler").TopologyCompiler;
////////////////////////////////////////////////////////////////////
let instance = JSON.parse(fs.readFileSync("./topology_config_example.json"));
let schema = JSON.parse(fs.readFileSync("../topology_config_schema.json"));
let v = new Validator();
let validation_result = v.validate(instance, schema);
if (validation_result.errors.length > 0) {
    console.error("Errors while parsing topology schema:");
    for (let error of validation_result.errors) {
        console.error(error.stack || error.property + " " + error.message);
    }
    process.exit(1);
}
else {
    console.log("Schema is valid.");
    console.log("Compiling");
    let compiler = new TopologyCompiler(instance);
    compiler.compile();
    console.log(JSON.stringify(compiler.getWholeConfig()));
}
