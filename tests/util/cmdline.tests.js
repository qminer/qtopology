"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const cmdl_lib = require("../../built/util/cmdline");

describe('CmdLineParser', function () {
    describe('constructor', function () {
        it('empty string', function () {
            let data = [];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", "ii", "smthng");
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: "ii" });
        });
        it('Non-matching string', function () {
            let data = ["k"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", "ii", "smthng");
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: "ii" });
        });
        it('Short name - missing value', function () {
            let data = ["-n"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", "ii", "smthng");
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: null });
        });
        it('Short name - valid', function () {
            let data = ["-n", "abc"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", "ii", "smthng");
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: "abc" });
        });
        it('Long name - missing value', function () {
            let data = ["--name"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", "ii", "smthng");
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: null });
        });
        it('Long name - valid', function () {
            let data = ["--name", "abc"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", "ii", "smthng");
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: "abc" });
        });
    });
});
