"use strict";

// topology context
const tn = require("../../").child;
// bolt implementation - same as in-proc
const blt = require("./bolt_common");

let bolt = new blt.MyBolt();
let context = new tn.TopologyContextBolt(bolt);
context.start();
