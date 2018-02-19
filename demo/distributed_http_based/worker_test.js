"use strict";

const qtopology = require("../../");

///////////////////////////////////////////////////////////////////////
let cmdln = new qtopology.CmdLineParser();
cmdln
    .define("n", "name", "worker1", "Logical name of the worker");
let opts = cmdln.process(process.argv);

qtopology.logger().setLevel("debug");

let storage = new qtopology.HttpStorage();
let w = new qtopology.TopologyWorker({
    name: opts.name, 
    storage: storage
});
w.run();

// after 5sec register new topology
setTimeout(() => {
    let topo1 = require("./topology.json");
    storage.registerTopology("topology.1", topo1, (err) => {
        if (err) {
            console.log("Topology was not registered:", err);
        } else {
            console.log("Topology sucessfully registered.");
            storage.enableTopology("topology.1", (err) => {
                if (err) {
                    console.log("Error while enabling the topology:", err);
                } else {
                    console.log("Topology sucessfully enabled.");
                }
            });
        }
    });
}, 5000);
