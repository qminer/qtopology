"use strict";

const tn = require("../../src/topology_node");

/////////////////////////////////////////////////////////////////////////////

class DataGenerator {
    constructor() {
        this._enabled = false;
        this._data = [];
        this._nextTs = Date.now() + 5000 * Math.random();
    }
    enable() {
        this._enabled = true;
    }
    disable() {
        this._enabled = false;
    }
    next() {
        if (!this._enabled) {
            return false;
        }
        let d = Date.now();
        if (d >= this._nextTs) {
            let cnt = Math.round(10 * Math.random() + 1);
            for (let i = 0; i < cnt; i++) {
                this._data.push({ d: d, n: d * 13 % 17 });
            }
        }
        if (this._data.length === 0) {
            return null;
        } else {
            return this._data.pop();
        }
    }
}
let generator = new DataGenerator();


// simple spout
const prefix="[Spout1]";

let topology_context = new tn.TopologyContextSpout();
topology_context.on("shutdown", () => {
    console.log(prefix, "Shutting down gracefully.");
    process.exit(0);
});
topology_context.on("heartbeat", () => {
    console.log(prefix, "Inside heartbeat.");
});
topology_context.on("init", (data) => {
    console.log(prefix, "Inside init:", data);
    topology_context.sendInitCompleted();
});
topology_context.on("run", () => {
    console.log(prefix, "Inside run");
    generator.enable();
});
topology_context.on("pause", () => {
    console.log(prefix, "Inside pause");
    generator.disable();
});
topology_context.on("next", () => {
    console.log(prefix, "Inside next");
    let data = generator.next();
    if (data) {
        topology_context.sendData(data);
    } else {
        topology_context.sendEmpty();
    }
});

topology_context.start();
