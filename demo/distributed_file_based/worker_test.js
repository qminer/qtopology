"use strict";

const qtopology = require("../../");

///////////////////////////////////////////////////////////////////////
let cmdln = new qtopology.CmdLineParser();
cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
let opts = cmdln.process(process.argv);

qtopology.logger().setLevel("debug");
let storage = new qtopology.FileStorage("./topologies", "*.json");

qtopology.logger().warn("***********************************************************************");
qtopology.logger().warn("** This worker will become dormant on each even minute (0, 2, 4, ...)");
qtopology.logger().warn("***********************************************************************");

let w = new qtopology.TopologyWorker({
    name: opts.name, 
    storage: storage,
    is_dormant_period: () => (new Date()).getMinutes() % 2 == 0 // alive only on odd minutes
});
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

setTimeout(() => { shutdown(); }, 200000);
