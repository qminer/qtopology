"use strict";

const async = require("async");
const tn = require("../../").local;
const validator = require("../../").validation;

// demo configuration
let config = require("./topology.json");
validator.validate({ config: config, exitOnError: true });
let topology = new tn.TopologyLocal();

async.series(
    [
        (xcallback) => {
            topology.init(config, xcallback);
        },
        (xcallback) => {
            console.log("Init done");
            topology.run();
            setTimeout(function () {
                xcallback();
            }, 20000);
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
