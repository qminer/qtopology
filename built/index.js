"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tc = require("./topology_compiler");
const tl = require("./topology_local");
const dw = require("./distributed/topology_worker");
const dsf = require("./distributed/file_based/file_coordinator");
const dshs = require("./distributed/http_based/http_coordination_storage");
const dshc = require("./distributed/http_based/http_coordinator");
const tv = require("./topology_validation");
const ul = require("./util/logger");
const uc = require("./util/cmdline");
const upm = require("./util/pattern_matcher");
const cpr = require("./util/child_proc_restarter");
let main = {
    // used for compiling configuration
    compiler: tc,
    // used for running single local topology in same process
    local: tl,
    // when running fully capable topology workers
    distributed: {
        // for single worker
        worker: dw,
        // std coordination providers
        std_coordinators: {
            // simple file-based coordination
            file: {
                coordinator: dsf
            },
            // simple HTTP-based coordination
            http: {
                storage: dshs,
                coordinator: dshc
            }
        }
    },
    // some exposed utilities
    util: {
        // for logging stuff
        logging: ul,
        // for validating schema
        validation: tv,
        // easier parsing of command line
        cmdline: uc,
        // for matching objects to certain pattern/query
        pattern_matcher: upm,
        // utiliy class for continously running a child process
        child_process_restarter: cpr
    }
};
exports.default = main;
//# sourceMappingURL=index.js.map