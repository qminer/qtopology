"use strict";

const qtoplogy = require("../../");
const cmdln_lib = qtoplogy.util.cmdline;
const stor = qtoplogy.distributed.std_coordinators.http.storage;

//////////////////////////////////////////////////
let cmdln = new cmdln_lib.CmdLineParser();
cmdln
    .define("p", "port", 3000, "Port");
let options = cmdln.process(process.argv);

// load single topology
let topo1 = require("./topology.json");
stor.addTopology(topo1);

stor.run(options);
