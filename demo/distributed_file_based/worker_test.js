"use strict";

const qtoplogy = require("../../");
const cmdln = qtoplogy.util.cmdline;
const wrkr = qtoplogy.distributed.worker;
const coor = qtoplogy.distributed.coordinator;
const stor = qtoplogy.distributed.std_coordinators.file.coordinator;

///////////////////////////////////////////////////////////////////////
cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
let opts = cmdln.process(process.argv);

let storage = new stor.FileCoordinator({
    dir_name: "./topologies",
    file_pattern: "*.json"
});

let w = new wrkr.TopologyWorker({
    name: opts.name,
    storage: storage
});
w.run();

function shutdown() {
    if (w) {
        w.shutdown(() => {
            console.log("Shutdown complete");
            process.exit(1);
        });
        w = null;
    }
}

setTimeout(
    () => {
        shutdown();
    },
    5000
);

//do something when app is closing
process.on('exit', shutdown);

//catches ctrl+c event
process.on('SIGINT', shutdown);

//catches uncaught exceptions
process.on('uncaughtException', shutdown);
