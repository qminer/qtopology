"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const ttb = require("../../built/std_nodes/type_transform_bolt");


describe.only('TypeTransformBolt', function () {
    it('constructable', function () {
        let target = new ttb.TypeTransformBolt();
    });
    it('init', function (done) {
        let emited = [];
        let name = "some_name";
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            date_transform_fields: ["field1", "field2"],
            numeric_transform_fields: ["field3"],
            bool_transform_fields: ["field4"]
        };
        let target = new ttb.TypeTransformBolt();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            done();
        });
    });
    it('receive', function (done) {
        let emited = [];
        let name = "some_name";
        let xdata = {
            field1: "2010-03-23T12:23:34Z",
            field2: "2010-03-23T12:23:34Z",
            field3: "3214",
            field4: "true",
            field5: "false"
        };
        let xdata_out = {
            field1: new Date("2010-03-23T12:23:34Z"),
            field2: new Date("2010-03-23T12:23:34Z"),
            field3: 3214,
            field4: true,
            field5: false
        };
        let xstream_id = null;
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            date_transform_fields: ["field1", "field2"],
            numeric_transform_fields: ["field3"],
            bool_transform_fields: ["field4", "field5"]
        };
        let target = new ttb.TypeTransformBolt();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            target.receive(xdata, xstream_id, (err) => {
                assert.ok(!err);
                assert.equal(emited.length, 1);
                assert.deepEqual(emited[0].data, xdata_out);
                assert.equal(emited[0].stream_id, xstream_id);
                done();
            });
        });
    });
});
