"use strict";

// simple console bolt
const tn = require("../../").child;
const cmdline = require("../../src/util/cmdline");

// Define command line arguments
cmdline
    .define('n', 'name', 'boltx', 'Logical name of this bolt');
let options = cmdline.process(process.argv);

let prefix = `[Bolt ${options.name}]`;
let sum = 0;

///////////////////////////////////////////////////////////////

let topology_context = new tn.TopologyContextBolt();

topology_context.on("shutdown", (data) => {
    //console.log(prefix, "Shutting down gracefully.");
    process.exit(0);
});
topology_context.on("heartbeat", () => {
    console.log(prefix, "Inside heartbeat. sum=" + sum);
});
topology_context.on("init", (data) => {
    //console.log(prefix, "Inside init:", data);
    topology_context.sendInitCompleted();
});
topology_context.on("run", () => {
    //console.log(prefix, "Inside run");
});
topology_context.on("pause", () => {
    //console.log(prefix, "Inside pause");
});
topology_context.on("data", (data) => {
    console.log(prefix, "Received data:", data);
    //sum += data.data.a;
    sum += data.a;
});

topology_context.start();
