"use strict";

const async = require("async");
const loc = require("../../src/topology_local");

// demo configuration

let config = {
    spouts: [
        {
            name: "pump1",
            worker: "srv1",
            working_dir: ".",
            cmd: "spout1.js",
            args: ["-a", "action1"],
            init: { timeout: 10000 }
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
            init: { timeout: 25000 }
        }
    ],
    variables: {}
};

let topology = new loc.TopologyLocal();

async.series(
    [
        (xcallback) => {
            topology.init(config, xcallback);
        },
        (xcallback) => {
            console.log("Init done");
            xcallback();
        },
        (xcallback) => {
            console.log("Starting shutdown sequence...");
            topology.shutdown(xcallback);
        }
    ],
    (err) => {
        if (err) {
            console.log("Error in shutdown", err);
        }
        console.log("Finished.");
    }
);
