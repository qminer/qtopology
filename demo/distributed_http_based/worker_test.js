"use strict";

// const cmdln = require("../../src/util/cmdline");
// const wrkr = require("../../src/distributed/topology_worker");
// const coor = require("../../src/distributed/topology_coordinator");
// const stor = require("../../src/distributed/http_based/http_coordinator");

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

function shutdown() {
    if (w) {
        w.shutdown(() => {
            process.exit(1);
        });
        w = null;
    }
}

//do something when app is closing
process.on("exit", shutdown);

//catches ctrl+c event
process.on("SIGINT", shutdown);

//catches uncaught exceptions
process.on("uncaughtException", (dat) => {
    console.log("uncaughtException", dat);
    shutdown();
});
