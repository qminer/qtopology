"use strict";

let common_context = {
    cnt: 0
};

exports.init = function (config, callback) {
    console.log("Common initialization");
    callback(null, common_context);
};

exports.shutdown = function (callback) {
    console.log("Common shutdown", common_context);
    callback();
};
