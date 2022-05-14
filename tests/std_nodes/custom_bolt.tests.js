"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const TopologyNodeBase = require("../../built/topology_local_inprocess");

class CustomBolt {
    constructor() {
        this._name = null;
        this._onEmit = null;
    }

    async init(name, config) {
        this._name = name;
        this._onEmit = config.onEmit;
    }

    heartbeat() { }
    async shutdown() { }

    async receive(data, stream_id) {
        // we just print the incoming data and pass it on
        if (this._onEmit) {
            await this._onEmit(data, stream_id)
        }
    }
}

const CUSTOM_CONFIG_NODE= {
    type: "custom",
    cmd: (config) => new CustomBolt(config),
};

describe('CustomBolt', function () {
    it('constructable', function () {
        let target = TopologyNodeBase.createCustomNode(CUSTOM_CONFIG_NODE);
    });

    it('init passes', function (done) {
        let emited = [];
        let name = "some_name";
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
            }
        };
        let target = TopologyNodeBase.createCustomNode(CUSTOM_CONFIG_NODE);
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            done();
        });
    });
    it('receive - must pass through', function (done) {
        let emited = [];
        let name = "some_name";
        let xdata = { test: true };
        let xstream_id = null;
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
            }
        };
        let target = TopologyNodeBase.createCustomNode(CUSTOM_CONFIG_NODE);
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            target.receive(xdata, xstream_id, (err) => {
                assert.ok(!err);
                assert.equal(emited.length, 1);
                assert.deepEqual(emited[0].data, xdata);
                assert.equal(emited[0].stream_id, xstream_id);
                done();
            });
        });
    });
});
