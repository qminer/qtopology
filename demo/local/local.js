"use strict";

const loc = require("../../src/topology/topology_local");

// demo configuration

let config = {
    spouts: [
        {
            name: "pump1",
            worker: "srv1",
            working_dir: ".",
            cmd: "spout1.js",
            args: ["-a", "action1"],
            init: {}
        }
    ],
    bolts: [
        {
            name: "bolt1",
            worker: "srv1",
            working_dir: ".",
            cmd: "bolt1.js",
            args: ["-n", "1"],
            inputs: [
                {
                    source: "pump1"
                }
            ],
            init: {}
        }
    ],
    variables: {}
};

let topology = new loc.TopologyLocal();
topology.init(config, (err) => {
    if (err) {
        console.log("Error in init", err);
    }
    console.log("Starting shutdown sequence...");
    topology.shutdown((err) => {
        if (err) {
            console.log("Error in shutdown", err);
        }
        console.log("Finished.");
    });
});
