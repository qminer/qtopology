"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ab = require("../../built/std_nodes/file_append_bolt");

/////////////////////////////////////////////////////////////////

var deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

/////////////////////////////////////////////////////////////////

describe('FileAppendBolt', function () {

    let dir = path.join(__dirname, "_tmp");
    let fname = path.join(__dirname, "_tmp", "out.tmp");
    let split_period = 60 * 60 * 1000;

    let toISOFormatLocal = function (d) {
        let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        let s = (new Date(d - tzoffset)).toISOString().slice(0, -1);
        return s;
    }
    let getFNameCurrent = function () {
        let d = Math.floor(Date.now() / split_period) * split_period;
        let s = toISOFormatLocal(d);
        s = s.slice(0, s.indexOf("."));
        s = s.replace(/\:/ig, "_").replace(/\-/ig, "_");
        return fname.replace(".tmp", "_" + s + ".tmp");
    }

    beforeEach(function () {
        deleteFolderRecursive(dir);
        fs.mkdirSync(dir);
    });

    afterEach(function () {
        deleteFolderRecursive(dir);
    });

    it('constructable', function () {
        let target = new ab.FileAppendBolt();
    });
    it('init', function (done) {
        let emited = [];
        let name = "some_name";
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            file_name_template: fname
        };
        let target = new ab.FileAppendBolt();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            done();
        });
    });
    describe('No splitting, no timestamp', function () {
        it('receive 1', function (done) {
            let emited = [];
            let name = "some_name";
            let config = {
                onEmit: (data, stream_id, callback) => {
                    emited.push({ data, stream_id });
                    callback();
                },
                file_name_template: fname
            };
            let xdata = { test: true };
            let target = new ab.FileAppendBolt();
            target.init(name, config, null, (err) => {
                assert.ok(!err);
                target.receive(xdata, null, (err) => {
                    assert.ok(!err);
                    target.shutdown((err) => {
                        assert.ok(fs.existsSync(config.file_name_template), "File doesn't exist: " + config.file_name_template);
                        let content = fs.readFileSync(config.file_name_template);
                        assert.equal(content, JSON.stringify(xdata) + "\n");
                        done();
                    });
                });
            });
        });
        it('receive 2', function (done) {
            let emited = [];
            let name = "some_name";
            let config = {
                onEmit: (data, stream_id, callback) => {
                    emited.push({ data, stream_id });
                    callback();
                },
                file_name_template: fname
            };
            let xdata = { test: true };
            let xdata2 = { test: false };
            let target = new ab.FileAppendBolt();
            target.init(name, config, null, (err) => {
                assert.ok(!err);
                target.receive(xdata, null, (err) => {
                    assert.ok(!err);
                    target.receive(xdata2, null, (err) => {
                        assert.ok(!err);
                        target.shutdown((err) => {
                            assert.ok(fs.existsSync(config.file_name_template), "File doesn't exist: " + config.file_name_template);
                            let content = fs.readFileSync(config.file_name_template);
                            assert.equal(content, JSON.stringify(xdata) + "\n" + JSON.stringify(xdata2) + "\n");
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('No splitting, WITH zip', function () {
        it('receive 1', function (done) {
            let emited = [];
            let name = "some_name";
            let config = {
                onEmit: (data, stream_id, callback) => {
                    emited.push({ data, stream_id });
                    callback();
                },
                file_name_template: fname,
                compress: true
            };
            let xdata = { test: true };
            let target = new ab.FileAppendBolt();
            target.init(name, config, null, (err) => {
                assert.ok(!err);
                target.receive(xdata, null, (err) => {
                    assert.ok(!err);
                    target.shutdown((err) => {
                        assert.ok(fs.existsSync(config.file_name_template + "_0.gz"), "File doesn't exist: " + config.file_name_template + "_0.gz");
                        done();
                    });
                });
            });
        });
    });
    describe('No splitting, WITH timestamp', function () {
        it('receive 1', function (done) {
            let emited = [];
            let name = "some_name";
            let config = {
                onEmit: (data, stream_id, callback) => {
                    emited.push({ data, stream_id });
                    callback();
                },
                file_name_template: fname,
                split_over_time: true,
                split_period: split_period
            };
            let xdata = { test: true };
            let target = new ab.FileAppendBolt();
            target.init(name, config, null, (err) => {
                assert.ok(!err);
                target.receive(xdata, null, (err) => {
                    assert.ok(!err);
                    target.shutdown((err) => {
                        let f = getFNameCurrent();
                        assert.ok(fs.existsSync(f), "File doesn't exist: " + f);
                        let content = fs.readFileSync(f);
                        assert.equal(content, JSON.stringify(xdata) + "\n");
                        done();
                    });
                });
            });
        });
        it('receive 2', function (done) {
            let emited = [];
            let name = "some_name";
            let config = {
                onEmit: (data, stream_id, callback) => {
                    emited.push({ data, stream_id });
                    callback();
                },
                file_name_template: fname,
                split_over_time: true,
                split_period: split_period
            };
            let xdata = { test: true };
            let xdata2 = { test: false };
            let target = new ab.FileAppendBolt();
            target.init(name, config, null, (err) => {
                assert.ok(!err);
                target.receive(xdata, null, (err) => {
                    assert.ok(!err);
                    target.receive(xdata2, null, (err) => {
                        assert.ok(!err);
                        target.shutdown((err) => {
                            let f = getFNameCurrent();
                            assert.ok(fs.existsSync(f), "File doesn't exist: " + f);
                            let content = fs.readFileSync(f);
                            assert.equal(content, JSON.stringify(xdata) + "\n" + JSON.stringify(xdata2) + "\n");
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('WITH splitting, WITH timestamp', function () {
        it('receive 1', function (done) {
            let emited = [];
            let name = "some_name";
            let config = {
                onEmit: (data, stream_id, callback) => {
                    emited.push({ data, stream_id });
                    callback();
                },
                file_name_template: fname,
                split_over_time: true,
                split_period: split_period,
                split_by_field: "server"
            };
            let xdata = { test: true, server: "srv1" };
            let target = new ab.FileAppendBolt();
            target.init(name, config, null, (err) => {
                assert.ok(!err);
                target.receive(xdata, null, (err) => {
                    assert.ok(!err);
                    target.shutdown((err) => {
                        let f = getFNameCurrent().replace(".tmp", "_srv1.tmp");
                        assert.ok(fs.existsSync(f), "File doesn't exist: " + f);
                        let content = fs.readFileSync(f);
                        assert.equal(content, JSON.stringify(xdata) + "\n");
                        done();
                    });
                });
            });
        });
        it('receive 2', function (done) {
            let emited = [];
            let name = "some_name";
            let config = {
                onEmit: (data, stream_id, callback) => {
                    emited.push({ data, stream_id });
                    callback();
                },
                file_name_template: fname,
                split_over_time: true,
                split_period: split_period,
                split_by_field: "server"
            };
            let xdata = { test: true, server: "srv1" };
            let xdata2 = { test: false, server: "srv2" };
            let target = new ab.FileAppendBolt();
            target.init(name, config, null, (err) => {
                assert.ok(!err);
                target.receive(xdata, null, (err) => {
                    assert.ok(!err);
                    target.receive(xdata2, null, (err) => {
                        assert.ok(!err);
                        target.shutdown((err) => {
                            let f = getFNameCurrent().replace(".tmp", "_srv1.tmp");
                            assert.ok(fs.existsSync(f), "File doesn't exist: " + f);
                            let content = fs.readFileSync(f);
                            assert.equal(content, JSON.stringify(xdata) + "\n");

                            f = getFNameCurrent().replace(".tmp", "_srv2.tmp");
                            assert.ok(fs.existsSync(f), "File doesn't exist: " + f);
                            content = fs.readFileSync(f);
                            assert.equal(content, JSON.stringify(xdata2) + "\n");
                            done();
                        });
                    });
                });
            });
        });
        describe('WITH splitting, WITH timestamp - nested field', function () {
            it('receive 1', function (done) {
                let emited = [];
                let name = "some_name";
                let config = {
                    onEmit: (data, stream_id, callback) => {
                        emited.push({ data, stream_id });
                        callback();
                    },
                    file_name_template: fname,
                    split_over_time: true,
                    split_period: split_period,
                    split_by_field: "tags.server"
                };
                let xdata = { test: true, tags: { server: "srv1" } };
                let target = new ab.FileAppendBolt();
                target.init(name, config, null, (err) => {
                    assert.ok(!err);
                    target.receive(xdata, null, (err) => {
                        assert.ok(!err);
                        target.shutdown((err) => {
                            let f = getFNameCurrent().replace(".tmp", "_srv1.tmp");
                            assert.ok(fs.existsSync(f), "File doesn't exist: " + f);
                            let content = fs.readFileSync(f);
                            assert.equal(content, JSON.stringify(xdata) + "\n");
                            done();
                        });
                    });
                });
            });
            it('receive 2', function (done) {
                let emited = [];
                let name = "some_name";
                let config = {
                    onEmit: (data, stream_id, callback) => {
                        emited.push({ data, stream_id });
                        callback();
                    },
                    file_name_template: fname,
                    split_over_time: true,
                    split_period: split_period,
                    split_by_field: "tags.server"
                };
                let xdata = { test: true, tags: { server: "srv1" } };
                let xdata2 = { test: false, tags: { server: "srv2" } };
                let target = new ab.FileAppendBolt();
                target.init(name, config, null, (err) => {
                    assert.ok(!err);
                    target.receive(xdata, null, (err) => {
                        assert.ok(!err);
                        target.receive(xdata2, null, (err) => {
                            assert.ok(!err);
                            target.shutdown((err) => {
                                let f = getFNameCurrent().replace(".tmp", "_srv1.tmp");
                                assert.ok(fs.existsSync(f), "File doesn't exist: " + f);
                                let content = fs.readFileSync(f);
                                assert.equal(content, JSON.stringify(xdata) + "\n");

                                f = getFNameCurrent().replace(".tmp", "_srv2.tmp");
                                assert.ok(fs.existsSync(f), "File doesn't exist: " + f);
                                content = fs.readFileSync(f);
                                assert.equal(content, JSON.stringify(xdata2) + "\n");
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});
