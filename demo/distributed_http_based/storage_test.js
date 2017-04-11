"use strict";

const cmdln = require("../../src/util/cmdline");
const stor = require("../../src/distributed/http_based/simple_coordination_storage");

//////////////////////////////////////////////////

cmdln
    .define("p", "port", 3000, "Port");
let options = cmdln.process(process.argv);

// load single topology
let topo1 = require("./topology.json");
stor.addTopology(topo1);

stor.run(options);
