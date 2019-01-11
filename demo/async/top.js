"use strict";

const qtopology = require("../..");
const shutdown = qtopology.runLocalTopologyFromFile("./topology.json");

// let topology run for 5 seconds
setTimeout(shutdown, 5 * 1000);
