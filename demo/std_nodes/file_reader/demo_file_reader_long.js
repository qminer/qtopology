"use strict";

const async = require("async");
const fs = require("fs");
const qtopology = require("../../../");

// demo configuration
let config = require("./topology_long.json");
qtopology.validate({ config: config, exitOnError: true });
let topology = new qtopology.TopologyLocal();

let data_file_name = "./data.long.txt";
async.series(
    [
        (xcallback) => {
            console.log("Writing file...");
            createLongFile(data_file_name, xcallback);
        },
        (xcallback) => {
            topology.init("topology.1", config, xcallback);
        },
        (xcallback) => {
            console.log("Init done");
            topology.run(() => {
                setTimeout(function () {
                    xcallback();
                }, 200000);
            });
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

function createLongFile(name, callback) {
    if (fs.existsSync(name)){
        return callback();
    }
    let counter = 1;
    async.whilst(
        () => (counter < 100000),
        (xcallback) => {
            let obj = { val: counter++ };
            fs.appendFile(name, JSON.stringify(obj) + "\n", xcallback);
        },
        callback
    );
    fs.appendFile(name)
}
