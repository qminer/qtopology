"use strict";

const async = require("async");
const qtopology = require("../../../");

// demo configuration
let config = require("./topology.json");
qtopology.validate({ config: config, exitOnError: true });
let topology = new qtopology.TopologyLocal();

async.series(
    [
        (xcallback) => {
            topology.init(config, xcallback);
        },
        (xcallback) => {
            console.log("Init done");
            topology.run();
            xcallback();
        },
        (xcallback) => {
            console.log("Waiting - 20 sec");
            setTimeout(() => { xcallback(); }, 20000);
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
