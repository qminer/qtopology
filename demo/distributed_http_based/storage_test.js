"use strict";

const qtoplogy = require("../../");
const cmdln = qtoplogy.util.cmdline;
const stor = qtoplogy.distributed.std_coordinators.http.storage;

//////////////////////////////////////////////////

cmdln
    .define("p", "port", 3000, "Port");
let options = cmdln.process(process.argv);

// load single topology
let topo1 = require("./topology.json");
stor.addTopology(topo1);

stor.run(options);
