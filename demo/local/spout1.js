"use strict";

const tn = require("../../").child;
const cmdline = require("../../src/util/cmdline");

/////////////////////////////////////////////////////////////////////////////

class DataGenerator {
    constructor() {
        this._enabled = false;
        this._data = [];
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
        if (this._data.length === 0) {
            this._data = [];
            for (let i = 0; i < 30; i++) {
                this._data.push({ a: i });
            }
            return null;
        } else {
            return this._data.pop();
        }
    }
}
let generator = new DataGenerator();


// simple spout
// Define command line arguments
cmdline
    .define('n', 'name', 'spoutx', 'Logical name of this spout');
let options = cmdline.process(process.argv);

let prefix = `[Spout ${options.name}]`;

let topology_context = new tn.TopologyContextSpout();
topology_context.on("shutdown", () => {
    //console.log(prefix, "Shutting down gracefully.");
    process.exit(0);
});
topology_context.on("heartbeat", () => {
    //console.log(prefix, "Inside heartbeat.");
});
topology_context.on("init", (data) => {
    //console.log(prefix, "Inside init:", data);
    topology_context.sendInitCompleted();
});
topology_context.on("run", () => {
    //console.log(prefix, "Inside run");
    generator.enable();
});
topology_context.on("pause", () => {
    //console.log(prefix, "Inside pause");
    generator.disable();
});
topology_context.on("next", () => {
    //console.log(prefix, "Inside next");
    let data = generator.next();
    if (data) {
        topology_context.sendData(data);
    } else {
        topology_context.sendEmpty();
    }
});

topology_context.start();
