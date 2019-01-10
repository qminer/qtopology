"use strict";

const qtopology = require("../..");
const t = qtopology.runLocalTopologyFromFile("./topology.json");

// let topology run for 5 seconds
setTimeout(() => {
    process.kill(process.pid);
}, 5 * 1000);
