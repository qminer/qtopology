"use strict";

const qtoplogy = require("../../");
const cmdln_lib = qtoplogy.util.cmdline;
const wrkr = qtoplogy.distributed.worker;
const coor = qtoplogy.distributed.coordinator;
const stor = qtoplogy.distributed.std_coordinators.http.coordinator;

///////////////////////////////////////////////////////////////////////
let cmdln = new cmdln_lib.CmdLineParser();
cmdln
    .define("n", "name", "worker1", "Logical name of the worker");
let opts = cmdln.process(process.argv);

let storage = new stor.HttpCoordinator();
let w = new wrkr.TopologyWorker(opts.name, storage);
w.run();
