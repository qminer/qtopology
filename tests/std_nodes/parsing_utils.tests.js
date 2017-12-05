"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const pu = require("../../built/std_nodes/parsing_utils");

describe('ProcessSpoutUtils', function () {
    describe('readRawFile', function () {
        it('should emit individual lines', function () {
            let tuples = [];
            let content = "a\nb\nc\nd";
            pu.Utils.readRawFile(content, tuples);
            assert.deepEqual(
                tuples,
                [
                    { content: "a" },
                    { content: "b" },
                    { content: "c" },
                    { content: "d" }
                ]);
        });
        it('should skip empty lines', function () {
            let tuples = [];
            let content = "a\nb\nc\n\n\nd";
            pu.Utils.readRawFile(content, tuples);
            assert.deepEqual(
                tuples,
                [
                    { content: "a" },
                    { content: "b" },
                    { content: "c" },
                    { content: "d" }
                ]);
        });
        it('should handle empty file', function () {
            let tuples = [];
            let content = "";
            pu.Utils.readRawFile(content, tuples);
            assert.equal(tuples.length, 0);
        });
    });
    describe('readJsonFile', function () {
        it('should emit individual lines', function () {
            let tuples = [];
            let input_tuples = [
                { a: 12, b: "v" },
                { c: true },
                { d: "((((((((((", e: { f: true, g: false } }
            ];
            let content = input_tuples.map(x => JSON.stringify(x)).join("\n");
            pu.Utils.readJsonFile(content, tuples);
            assert.deepEqual(tuples, input_tuples);
        });
        it('should skip empty lines', function () {
            let tuples = [];
            let input_tuples = [
                { a: 12, b: "v" },
                null,
                { c: true },
                null,
                { d: "((((((((((", e: { f: true, g: false } }
            ];
            let content = input_tuples.map(x => (x != null ? JSON.stringify(x) : "")).join("\n");
            pu.Utils.readJsonFile(content, tuples);
            assert.deepEqual(tuples, input_tuples.filter(x => x));
        });
        it('should handle empty file', function () {
            let tuples = [];
            let content = "";
            pu.Utils.readJsonFile(content, tuples);
            assert.equal(tuples.length, 0);
        });
    });
    describe('readCsvFile', function () {
        describe('no header line', function () {
            it('should emit individual lines', function () {
                let tuples = [];
                let content = "1,2,3\n4,5,6\n7,8,9";
                pu.Utils.readCsvFile(content, tuples, false, ",", ["x", "y", "z"]);
                assert.deepEqual(
                    tuples,
                    [
                        { x: 1, y: 2, z: 3 },
                        { x: 4, y: 5, z: 6 },
                        { x: 7, y: 8, z: 9 }
                    ]);
            });
            it('should handle empty lines', function () {
                let tuples = [];
                let content = "1,2,3\n\n\n4,5,6\n7,8,9";
                pu.Utils.readCsvFile(content, tuples, false, ",", ["x", "y", "z"]);
                assert.deepEqual(
                    tuples,
                    [
                        { x: 1, y: 2, z: 3 },
                        { x: 4, y: 5, z: 6 },
                        { x: 7, y: 8, z: 9 }
                    ]);
            });
            it('should handle empty content', function () {
                let tuples = [];
                let content = "";
                pu.Utils.readCsvFile(content, tuples, false, ",", ["x", "y", "z"]);
                assert.equal(tuples.length, 0);
            });
        });
        describe('with header line', function () {
            it('should emit individual lines', function () {
                let tuples = [];
                let content = "x,y,z\n1,2,3\n4,5,6\n7,8,9";
                pu.Utils.readCsvFile(content, tuples, true, ",", null);
                assert.deepEqual(
                    tuples,
                    [
                        { x: 1, y: 2, z: 3 },
                        { x: 4, y: 5, z: 6 },
                        { x: 7, y: 8, z: 9 }
                    ]);
            });
            it('should handle empty lines', function () {
                let tuples = [];
                let content = "x,y,z\n1,2,3\n\n\n4,5,6\n7,8,9";
                pu.Utils.readCsvFile(content, tuples, true, ",", null);
                assert.deepEqual(
                    tuples,
                    [
                        { x: 1, y: 2, z: 3 },
                        { x: 4, y: 5, z: 6 },
                        { x: 7, y: 8, z: 9 }
                    ]);
            });
            it('should handle empty content', function () {
                let tuples = [];
                let content = "";
                pu.Utils.readCsvFile(content, tuples, true, ",", null);
                assert.equal(tuples.length, 0);
            });
            it('should handle empty content - only header', function () {
                let tuples = [];
                let content = "x,y,z\n";
                pu.Utils.readCsvFile(content, tuples, true, ",", null);
                assert.equal(tuples.length, 0);
            });
        });
    });
});
