"use strict";

let spt = require("./spout_common");

exports.create = function () {
    return new spt.MySpout();
};
