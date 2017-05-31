"use strict";

exports.init = function (config, context, callback) {
    console.log("Common initialization - this one SHOULD NOT be displayed");
    callback();
};

exports.shutdown = function (callback) {
    console.log("Common shutdown - this one SHOULD NOT be displayed");
    callback();
};
