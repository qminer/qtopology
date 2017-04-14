"use strict";

let common_context = {
    cnt: 0
};

exports.init = function (config, context, callback) {
    console.log("Custom initialization");
    common_context = context;
    common_context.cnt = 0;
    callback();
};

exports.shutdown = function (callback) {
    console.log("Custom shutdown", common_context);
    callback();
};
