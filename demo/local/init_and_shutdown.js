"use strict";

exports.init = function (callback) {
    console.log("Common initialization");
    callback();
}

exports.shutdown = function (callback) {
    console.log("Common shutdown");
    callback();
}
