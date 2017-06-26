"use strict";

const qtopology = require("../../..");

let server = new qtopology.MinimalHttpServer();

server.addRoute("a.html", "./a.html");
server.addRoute("a.js", "./a.js");
server.run(3000);
