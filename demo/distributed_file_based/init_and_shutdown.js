"use strict";

let common_context = {
    cnt: 0
};

exports.init = function (config, context, callback) {
    console.log("Custom initialization");
    common_context = context;
    common_context.cnt = 0;
    setTimeout(() => {
        // simulate some lengthy processing
        callback();
    }, Math.floor(3000 * Math.random()));
};

exports.shutdown = function (callback) {
    console.log("Custom shutdown", common_context);
    setTimeout(() => {
        // simulate some lengthy processing
        console.log("Exiting custom shutdown...", common_context);
        callback();
    }, Math.floor(5000 * Math.random()));
};
