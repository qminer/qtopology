"use strict";
var spt = require("./spouts");
exports.create = function () {
    return new spt.DummySpout();
};
