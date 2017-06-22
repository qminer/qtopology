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
        it('Short name - multi', function () {
            let data = ["-n", "abc", "-c", "def"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", "ii", "smthng")
                .define("c", "config", "jj", "smthng");
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: "abc", config: "def" });
        });
        it('Short+long name - multi and mixed', function () {
            let data = ["-n", "abc", "--config", "def"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", "ii", "smthng")
                .define("c", "config", "jj", "smthng");
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: "abc", config: "def" });
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
    describe('Flags', function () {
        it('Short name', function () {
            let data = ["-n"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", false, "smthng", { flag: true })
                .define("c", "config", false, "smthng", { flag: true });
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: true });
        });
        it('Long name', function () {
            let data = ["--name"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", false, "smthng", { flag: true })
                .define("c", "config", false, "smthng", { flag: true });
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: true });
        });
        it('Mixed name', function () {
            let data = ["-c", "--name"];
            let cmdl = new cmdl_lib.CmdLineParser();
            cmdl
                .define("n", "name", false, "smthng", { flag: true })
                .define("c", "config", false, "smthng", { flag: true });
            let res = cmdl.process(data);
            assert.deepEqual(res, { name: true, config: true });
        });
    });
});
describe('parseCommandLine', function () {
    it('empty', function () {
        let data = [];
        let res = cmdl_lib.parseCommandLine(data);
        assert.deepEqual(res, { _: [] });
    });
    it('simple, no tags', function () {
        let data = ["a", "b", "c"];
        let res = cmdl_lib.parseCommandLine(data);
        assert.deepEqual(res, { _: ["a", "b", "c"] });
    });
    it('simple, short binary tags', function () {
        let data = ["-a", "-b", "-c"];
        let res = cmdl_lib.parseCommandLine(data);
        assert.deepEqual(res, { a: true, b: true, c: true, _: [] });
    });
    it('simple, long binary tags', function () {
        let data = ["--a", "--b", "--c"];
        let res = cmdl_lib.parseCommandLine(data);
        assert.deepEqual(res, { a: true, b: true, c: true, _: [] });
    });
    it('simple, short value tags', function () {
        let data = ["-a", "1", "-b", "2", "-c", "3"];
        let res = cmdl_lib.parseCommandLine(data);
        assert.deepEqual(res, { a: "1", b: "2", c: "3", _: [] });
    });
    it('simple, long value tags', function () {
        let data = ["--a", "1", "--b", "2", "--c", "3"];
        let res = cmdl_lib.parseCommandLine(data);
        assert.deepEqual(res, { a: "1", b: "2", c: "3", _: [] });
    });
    it('complex', function () {
        let data = ["--a", "1", "-b", "2", "some_value1", "some_value2", "-c"];
        let res = cmdl_lib.parseCommandLine(data);
        assert.deepEqual(res, { a: "1", b: "2", c: true, _: ["some_value1", "some_value2"] });
    });
});

describe('parseCommandLineEx', function () {
    describe('parseCommandLineEx - no map parameter', function () {
        it('empty', function () {
            let data = [];
            let res = cmdl_lib.parseCommandLineEx(data);
            assert.deepEqual(res, { _: [] });
        });
        it('complex', function () {
            let data = ["--a", "1", "-b", "2", "some_value1", "some_value2", "-c"];
            let res = cmdl_lib.parseCommandLineEx(data);
            assert.deepEqual(res, { a: "1", b: "2", c: true, _: ["some_value1", "some_value2"] });
        });
    });
    describe('parseCommandLineEx - with empty map parameter', function () {
        it('empty', function () {
            let data = [];
            let res = cmdl_lib.parseCommandLineEx(data, {});
            assert.deepEqual(res, { _: [] });
        });
        it('complex', function () {
            let data = ["--a", "1", "-b", "2", "some_value1", "some_value2", "-c"];
            let res = cmdl_lib.parseCommandLineEx(data, {});
            assert.deepEqual(res, { a: "1", b: "2", c: true, _: ["some_value1", "some_value2"] });
        });
    });
    describe('parseCommandLineEx - with non-empty map parameter', function () {
        it('empty', function () {
            let data = [];
            let res = cmdl_lib.parseCommandLineEx(data, { c: "config" });
            assert.deepEqual(res, { _: [] });
        });
        it('complex', function () {
            let data = ["--a", "1", "-b", "2", "some_value1", "some_value2", "-c"];
            let res = cmdl_lib.parseCommandLineEx(data, { a: "actor", c: "config" });
            assert.deepEqual(res, { a: "1", actor: "1", b: "2", c: true, config: true, _: ["some_value1", "some_value2"] });
        });
    });
});
