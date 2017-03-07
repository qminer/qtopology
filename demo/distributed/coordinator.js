"use strict";

const coord = require("../../src/topology/topology_coordinator");

let c = new coord.TopologyCoordinator("./topology.json");
c.start();
