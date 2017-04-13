"use strict";
var common_context = {
    cnt: 0
};
exports.init = function (config, context, callback) {
    console.log("Common initialization");
    common_context = context;
    common_context.cnt = 0;
    callback();
};
exports.shutdown = function (callback) {
    console.log("Common shutdown", common_context);
    callback();
};
