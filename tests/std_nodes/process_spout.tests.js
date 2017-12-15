"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const ps = require("../../built/std_nodes/process_spout");

describe('ProcessContinuousSpout', function () {
    it('constructable', function () {
        let target = new ps.ProcessSpoutContinuous();
    });
    it('init passes', function (done) {
        let name = "spouty_mcspoutface";
        let config = {
            cmd_line: "node ./tests/std_nodes/simple_proc.js",
            emit_parse_errors: false,
            emit_stderr_errors: false,
            emit_error_on_exit: false,
        };
        let target = new ps.ProcessSpoutContinuous();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            done();
        });
    });
    it('emits a JSON', function (done) {
        let name = "spouty_mcspoutface";
        let config = {
            cmd_line: "node ./tests/std_nodes/simple_proc.js",
            file_format: "json",
            emit_parse_errors: false,
            emit_stderr_errors: false,
            emit_error_on_exit: false,
        };
        let target = new ps.ProcessSpoutContinuous();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            target.run();
            setTimeout(() => {
                target.next((err, data, stream_id) => {
                    assert.equal(err, null);
                    assert.deepEqual(data, { a: 5 });
                    assert.equal(stream_id, null);
                    done();
                });
            }, 300);
        });
    });
    it('emits a parse error', function (done) {
        let name = "spouty_mcspoutface";
        let config = {
            cmd_line: "node ./tests/std_nodes/simple_proc.js",
            file_format: "json",
            emit_parse_errors: true,
            emit_stderr_errors: false,
            emit_error_on_exit: false,
        };
        let target = new ps.ProcessSpoutContinuous();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            target.run();
            setTimeout(() => {
                target.next((err, data, stream_id) => {
                    target.next((err, data, stream_id) => {
                        assert.notEqual(err, null);
                        assert.equal(data, null);
                        assert.equal(stream_id, null);
                        done();
                    });
                });
            }, 300);
        });
    });
    it('emits a stderr error', function (done) {
        let name = "spouty_mcspoutface";
        let config = {
            cmd_line: "node ./tests/std_nodes/simple_proc.js",
            file_format: "json",
            emit_parse_errors: false,
            emit_stderr_errors: true,
            emit_error_on_exit: false,
        };
        let target = new ps.ProcessSpoutContinuous();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            target.run();
            setTimeout(() => {
                target.next((err, data, stream_id) => {
                    assert.notEqual(err, null);
                    assert.equal(data, null);
                    assert.equal(stream_id, null);
                    done();
                });
            }, 300);
        });
    });
    it('emits an error on exit', function (done) {
        let name = "spouty_mcspoutface";
        let config = {
            cmd_line: "node ./tests/std_nodes/simple_proc.js",
            file_format: "json",
            emit_parse_errors: false,
            emit_stderr_errors: false,
            emit_error_on_exit: true,
        };
        let target = new ps.ProcessSpoutContinuous();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            target.run();
            setTimeout(() => {
                target.next((err, data, stream_id) => {
                    assert.notEqual(err, null);
                    assert.equal(data, null);
                    assert.equal(stream_id, null);
                    done();
                });
            }, 300);
        });
    });
});
