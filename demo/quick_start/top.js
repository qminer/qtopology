"use strict";

const qtopology = require("../../built/index.js");

// load configuration from file
let config = require("./topology.json");

// compile it - injects variables and performs some checks
let compiler = new qtopology.TopologyCompiler(config);
compiler.compile();
config = compiler.getWholeConfig();

// ok, create topology
let topology = new qtopology.TopologyLocal();
topology.init("uuid.1", config, (err) => {
    if (err) { console.log(err); return; }
    // let topology run for 20 seconds
    topology.run((e)=>{
        if (e) { console.log(e) }
        setTimeout(() => {
            topology.shutdown((err) => {
                if (err) { console.log(err); }
                console.log("Finished.");
            });
        }, 20 * 1000);
    });
});