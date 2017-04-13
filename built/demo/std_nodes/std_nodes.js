"use strict";
var async = require("async");
var tn = require("../../").local;
var validator = require("../../").validation;
// demo configuration
var config = require("./topology.json");
validator.validate({ config: config, exitOnError: true });
var topology = new tn.TopologyLocal();
async.series([
    function (xcallback) {
        topology.init(config, xcallback);
    },
    function (xcallback) {
        console.log("Init done");
        topology.run();
        setTimeout(function () {
            xcallback();
        }, 20000);
    },
    function (xcallback) {
        console.log("Starting shutdown sequence...");
        topology.shutdown(xcallback);
    }
], function (err) {
    if (err) {
        console.log("Error in shutdown", err);
    }
    console.log("Finished.");
});
