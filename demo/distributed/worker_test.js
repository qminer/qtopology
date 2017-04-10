"use strict";

const cmdln = require("../../src/util/cmdline");
const wrkr = require("../../src/distributed/topology_worker");
const coor = require("../../src/distributed/topology_coordinator");

const stor = require("./simple_coordinator");

///////////////////////////////////////////////////////////////////////
cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
cmdln.process(process.argv);

cmdln.name = "xxxxq";
let storage = new stor.SimpleCoordinator();
let coordinator = new coor.TopologyCoordinator({
    name: cmdln.name,
    storage: storage
});

let options = {
    name: cmdln.name,
    coordinator: coordinator
};

let w = new wrkr.TopologyWorker(options);
w.run();
