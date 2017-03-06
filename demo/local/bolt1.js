"use strict";

// simple console bolt
const tn = require("../../src/topology_node");
const prefix="[Bolt1]";

let topology_context = new tn.TopologyContextBolt();

topology_context.on("shutdown", (data) => {
    console.log(prefix, "Shutting down gracefully.");
    process.exit(0);
});
topology_context.on("heartbeat", () => {
    console.log(prefix, "Inside heartbeat.");
});
topology_context.on("init", (data) => {
    console.log(prefix, "Inside init:", data);
    topology_context.sendInitCompleted();
});
topology_context.on("run", () => {
    console.log(prefix, "Inside run");
});
topology_context.on("pause", () => {
    console.log(prefix, "Inside pause");
});
topology_context.on("data", (data) => {
    console.log(prefix, "Received data:", data);
});

topology_context.start();
