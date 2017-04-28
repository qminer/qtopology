"use strict";

const async = require("async");
const qtopology = require("../../../");
const tn = qtopology.local;
const validator = qtopology.util.validation;

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


function shutdown() {
    if (topology) {
        topology.shutdown((err) => {
            if (err) {
                console.log("Error", err);
            }
            process.exit(1);
        });
        topology = null;
    }
}

//do something when app is closing
process.on('exit', shutdown);

//catches ctrl+c event
process.on('SIGINT', shutdown);

//catches uncaught exceptions
process.on('uncaughtException',
    (e) => {
        console.log(e);
        process.exit(1);
    }
    //shutdown
);
