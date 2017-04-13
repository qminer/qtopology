"use strict";
// topology context
var tn = require("../../").child;
// bolt implementation - same as in-proc
var blt = require("./bolt_common");
var bolt = new blt.MyBolt();
var context = new tn.TopologyContextBolt(bolt);
context.start();
