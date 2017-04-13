"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var qtoplogy = require("../../");
var cmdln = qtoplogy.util.cmdline;
var stor = qtoplogy.distributed.std_coordinators.http.storage;
//////////////////////////////////////////////////
cmdln
    .define("p", "port", 3000, "Port");
var options = cmdln.process(process.argv);
// load single topology
var topo1 = require("./topology.json");
stor.addTopology(topo1);
stor.run(options);
