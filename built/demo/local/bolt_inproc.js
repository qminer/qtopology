"use strict";
var bolt = require("./bolt_common");
exports.create = function (context) {
    return new bolt.MyBolt(context);
};
