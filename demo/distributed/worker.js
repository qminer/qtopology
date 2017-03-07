"use strict";

const cmdline = require('../../src/topology/cmdline');
const wrkr = require("../../src/topology/topology_worker");

// Define command line arguments
cmdline
    .define('p', 'port', 7658, 'Port on this machine where data will be received')
    .define('h', 'chost', 'localhost', 'Host where coordinator is running')
    .define('c', 'cport', 9289, 'Port on host where coordinator is listening')
    .define('n', 'name', 'worker1', 'Logical name of the worker');

// Process command line
let options = cmdline.process(process.argv);

let w = new wrkr.TopologyWorker(options);
w.start();
