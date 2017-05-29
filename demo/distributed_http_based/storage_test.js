"use strict";

const qtopology = require("../../");

//////////////////////////////////////////////////

let cmdln = new qtopology.CmdLineParser();
cmdln
    .define("p", "port", 3000, "Port");
let options = cmdln.process(process.argv);

qtopology.runHttpServer(options);
