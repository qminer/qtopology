"use strict";

let spt = require("./spouts");

exports.create = function () {
    return new spt.DummySpout();
};
