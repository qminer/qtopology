"use strict";

const qtoplogy = require("../../");
const cmdln_lib = qtoplogy.util.cmdline;
const wrkr = qtoplogy.distributed.worker;
const coor = qtoplogy.distributed.coordinator;
const stor = qtoplogy.distributed.std_coordinators.file.coordinator;

///////////////////////////////////////////////////////////////////////
let cmdln = new cmdln_lib.CmdLineParser();
cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
let opts = cmdln.process(process.argv);

let storage = new stor.FileCoordinator("./topologies", "*.json");

let w = new wrkr.TopologyWorker(opts.name, storage);
w.run();

function shutdown() {
    if (w) {
        w.shutdown((err) => {
            if (err) {
                console.log("Error while global shutdown:", err);
            }
            console.log("Shutdown complete");
            process.exit(1);
        });
        w = null;
    }
}

setTimeout(() => { shutdown(); }, 5000);
