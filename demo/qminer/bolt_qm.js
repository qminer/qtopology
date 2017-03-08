"use strict";

const bolt = require("./bolts");

exports.create = function () {
    return new bolt.QMinerBolt();
};
