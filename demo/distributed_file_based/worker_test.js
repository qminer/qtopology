"use strict";

const qtoplogy = require("../../");
const cmdln = qtoplogy.util.cmdline;
const wrkr = qtoplogy.distributed.worker;
const coor = qtoplogy.distributed.coordinator;
const stor = qtoplogy.distributed.std_coordinators.file;

///////////////////////////////////////////////////////////////////////
cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
let opts = cmdln.process(process.argv);

let storage = new stor.FileCoordinator("./topologies");
let coordinator = new coor.TopologyCoordinator({
    name: opts.name,
    storage: storage
});

let options = {
    name: opts.name,
    coordinator: coordinator
};

let w = new wrkr.TopologyWorker(options);
w.run();

function shutdown() {
    if (w) {
        w.shutdown(() => {
            process.exit(1);
        });
        w = null;
    }
}

//do something when app is closing
process.on('exit', shutdown);

//catches ctrl+c event
process.on('SIGINT', shutdown);

//catches uncaught exceptions
process.on('uncaughtException', shutdown);
