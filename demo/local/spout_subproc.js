"use strict";

// topology context
const tn = require("../../").child;
// spout implementation - same as in-proc
const spt = require("./spout_common");

let spout = new spt.MySpout();
let context = new tn.TopologyContextSpout(spout);
context.start();
