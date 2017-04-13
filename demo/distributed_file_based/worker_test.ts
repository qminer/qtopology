"use strict";

import qtoplogy = require("../../");
const cmdln = qtoplogy.util.cmdline;
const wrkr = qtoplogy.distributed.worker;
const stor = qtoplogy.distributed.std_coordinators.file.coordinator;

///////////////////////////////////////////////////////////////////////
interface Options { name: string };

cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
let opts = cmdln.process(process.argv) as Options;

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
