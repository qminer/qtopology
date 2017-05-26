"use strict";

const async = require("async");
const qtopology = require("../../");

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
            setTimeout(function () {
                xcallback();
            }, 4120);
        },
        (xcallback) => {
            console.log("Starting shutdown sequence...");
            topology.shutdown(xcallback);
            topology = null;
        }
    ],
    (err) => {
        if (err) {
            console.log("Error", err);
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
process.on('uncaughtException', shutdown);
