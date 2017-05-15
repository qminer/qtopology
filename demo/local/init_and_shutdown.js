"use strict";

const log = require("../..").util.logging;

let common_context = {
    cnt: 0
};

exports.init = function (config, context, callback) {
    log.logger().important("Common initialization");
    common_context = context;
    common_context.cnt = 0;
    callback();
};

exports.shutdown = function (callback) {
    log.logger().important("Common shutdown", common_context);
    callback();
};
