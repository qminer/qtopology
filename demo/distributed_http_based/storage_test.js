"use strict";

const qtopology = require("../../");

//////////////////////////////////////////////////
let cmdln = new qtopology.CmdLineParser();
cmdln
    .define("p", "port", 3000, "Port");
let options = cmdln.process(process.argv);

// load single topology
let topo1 = require("./topology.json");
stor.addTopology(topo1);

stor.run(options);
