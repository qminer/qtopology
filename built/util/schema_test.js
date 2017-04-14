"use strict";
var fs = require("fs");
var Validator = require("jsonschema").Validator;
var TopologyCompiler = require("../topology_compiler").TopologyCompiler;
////////////////////////////////////////////////////////////////////
var instance = JSON.parse(fs.readFileSync("./topology_config_example.json"));
var schema = JSON.parse(fs.readFileSync("../topology_config_schema.json"));
var v = new Validator();
var validation_result = v.validate(instance, schema);
if (validation_result.errors.length > 0) {
    console.error("Errors while parsing topology schema:");
    for (var _i = 0, _a = validation_result.errors; _i < _a.length; _i++) {
        var error = _a[_i];
        console.error(error.stack || error.property + " " + error.message);
    }
    process.exit(1);
}
else {
    console.log("Schema is valid.");
    console.log("Compiling");
    var compiler = new TopologyCompiler(instance);
    compiler.compile();
    console.log(JSON.stringify(compiler.getWholeConfig()));
}
