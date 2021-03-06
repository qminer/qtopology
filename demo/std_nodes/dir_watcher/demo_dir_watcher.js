"use strict";

const fs = require("fs");
const async = require("async");
const qtopology = require("../../..");

// demo configuration
let config = require("./topology.json");
qtopology.validate({ config: config, exitOnError: true });
let topology = new qtopology.TopologyLocal();

async.series(
    [
        (xcallback) => {
            console.log("Starting init");
            topology.init("topology.1", config, xcallback);
        },
        (xcallback) => {
            console.log("Init done");
            topology.run(xcallback);
        },
        (xcallback) => {
            console.log("Waiting - 2 sec");
            setTimeout(() => { xcallback(); }, 2000);
        },
        (xcallback) => {
            fs.appendFileSync("./temp_file.tmp", "Some content\n", { encoding: "utf8" });
            setTimeout(function () {
                xcallback();
            }, 2000);
        },
        (xcallback) => {
            fs.appendFileSync("./temp_file.tmp", "Another content\n", { encoding: "utf8" });
            setTimeout(function () {
                xcallback();
            }, 2000);
        },
        (xcallback) => {
            fs.unlinkSync("./temp_file.tmp");
            setTimeout(function () {
                xcallback();
            }, 2000);
        },
        (xcallback) => {
            console.log("Starting shutdown sequence...");
            topology.shutdown(xcallback);
            topology = null;
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
process.on('uncaughtException', shutdown);
