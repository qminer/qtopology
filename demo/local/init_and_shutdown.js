"use strict";

const qtopology = require("../..");

let common_context = {
    cnt: 0
};

exports.init = function (config, context, callback) {
    qtopology.logger().important("Common initialization");
    common_context = context;
    common_context.cnt = 0;
    callback();
};

exports.shutdown = function (callback) {
    qtopology.logger().important("Common shutdown", common_context);
    callback();
};
