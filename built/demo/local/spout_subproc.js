"use strict";
// topology context
var tn = require("../../").child;
// spout implementation - same as in-proc
var spt = require("./spout_common");
var spout = new spt.MySpout();
var context = new tn.TopologyContextSpout(spout);
context.start();
