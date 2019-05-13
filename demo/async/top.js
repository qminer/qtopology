"use strict";

const qtopology = require("../..");
const shutdown = qtopology.runLocalTopologyFromFile("./topology.json");

// let topology run for 5 seconds, then exit without error
setTimeout(() => {
    shutdown(0);
}, 5 * 1000);
