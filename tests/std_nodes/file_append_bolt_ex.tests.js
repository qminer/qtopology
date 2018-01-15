"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const async = require("async");
const abe = require("../../built/std_nodes/file_append_bolt_ex");

///////////////////////////////////////////////////////////////////

// describe('FileAppendBoltEx - utils', function () {
//     // it('constructable', function () {
//     //     let target = abe.Utils;
//     //     let res = target.toISOFormatLocal(1511648772000);
//     //     assert.equal(res, "2017-11-25T22:26:12.000");
//     // });
//     describe('getValueFromObject - utils', function () {
//         it('simple', function () {
//             let target = abe.Utils;
//             let res = target.getValueFromObject({ a: 12 }, ["a"]);
//             assert.equal(res, 12);
//         });
//         it('nested', function () {
//             let target = abe.Utils;
//             let res = target.getValueFromObject({ a: { b: 12 } }, ["a", "b"]);
//             assert.equal(res, 12);
//         });
//     });
// });

describe('FileAppendBoltEx - bucket handler', function () {
    describe('test 1', function () {
        let bh_factory = () => {
            return new abe.BucketHandler("", "out.txt", "server", Date.now(), 1000);
        };
        it('creatable', function () {
            let target = bh_factory();
        });
        it('should handle zip errors', function (done) {
            let target = bh_factory();
            target.zipFile("tex.txt", (e) => {
                assert(e == null);
                done();
            });
        });
        it('should handle closing uninitialized', function (done) {
            let target = bh_factory();
            target.closeCurrentFile((e) => {
                assert(e == null);
                done();
            });
        });

        // it('flush with no data', function (done) {
        //     let target = bh_factory();
        //     target.flush(done);
        // });

        // it('add 1 and close', function (done) {
        //     let target = bh_factory();
        //     async.series(
        //         [
        //             (cb) => {
        //                 target.receive(Date.now(), "a", cb);
        //             },
        //             (cb) => {
        //                 target.close(cb);
        //             },
        //         ],
        //         done
        //     );
        // });

        // it('add 1, flush and close', function (done) {
        //     let target = bh_factory();
        //     async.series(
        //         [
        //             (cb) => {
        //                 target.receive(Date.now(), "a", cb);
        //             },
        //             (cb) => {
        //                 target.flush(cb);
        //             },
        //             (cb) => {
        //                 target.close(cb);
        //             },
        //         ],
        //         done
        //     );
        // });
    });
});
