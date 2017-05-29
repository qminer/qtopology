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

// after 5sec register new topology
setTimeout(() => {
    let topo1 = require("./topology.json");
    storage.registerTopology(topo1, true, (err) => {
        if (err) {
            console.log("Topology was not registered:", err);
        } else {
            console.log("Topology sucessfully registered.");
        }
    });
}, 5000);
