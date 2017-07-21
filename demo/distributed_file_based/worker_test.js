"use strict";

const qtopology = require("../../");

///////////////////////////////////////////////////////////////////////
let cmdln = new qtopology.CmdLineParser();
cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
let opts = cmdln.process(process.argv);

qtopology.logger().setLevel("debug");
let storage = new qtopology.FileCoordinator("./topologies", "*.json");

let w = new qtopology.TopologyWorker(opts.name, storage);
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

setTimeout(() => { shutdown(); }, 20000);
