"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const cmdln = require("../../src/util/cmdline");
// const wrkr = require("../../src/distributed/topology_worker");
// const coor = require("../../src/distributed/topology_coordinator");
// const stor = require("../../src/distributed/http_based/http_coordinator");
var qtoplogy = require("../../");
var cmdln = qtoplogy.util.cmdline;
var wrkr = qtoplogy.distributed.worker;
var stor = qtoplogy.distributed.std_coordinators.http.coordinator;
;
cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
var opts = cmdln.process(process.argv);
var storage = new stor.HttpCoordinator();
var w = new wrkr.TopologyWorker({
    name: opts.name,
    storage: storage
});
w.run();
function shutdown() {
    if (w) {
        w.shutdown(function () {
            process.exit(1);
        });
        w = null;
    }
}
//do something when app is closing
process.on('exit', shutdown);
//catches ctrl+c event
process.on('SIGINT', shutdown);
//catches uncaught exceptions
process.on('uncaughtException', shutdown);
