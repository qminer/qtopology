"use strict";

const qtopology = require("../../");

///////////////////////////////////////////////////////////////////////
let cmdln = new qtopology.CmdLineParser();
cmdln
    .define("n", "name", "worker1", "Logical name of the worker");
let opts = cmdln.process(process.argv);

let storage = new qtopology.HttpCoordinator();
let w = new qtopology.TopologyWorker(opts.name, storage);
w.run();
