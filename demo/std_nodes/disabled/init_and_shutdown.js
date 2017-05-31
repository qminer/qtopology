"use strict";

exports.init = function (config, context, callback) {
    console.log("Common initialization - this one is OK to be displayed");
    callback();
};

exports.shutdown = function (callback) {
    console.log("Common shutdown - this one is OK to be displayed");
    callback();
};
