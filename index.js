"use strict";

module.exports = {
    // used for compiling configuration
    compiler: require("./built/topology_compiler"),
    // used for running single local topology in same process
    local: require("./built/topology_local"),
    // when running fully capable topology workers
    distributed: {
        // for single worker
        worker: require("./built/distributed/topology_worker"),
        // std coordination providers
        std_coordinators: {
            // simple file-based coordination
            file: {
                coordinator: require("./built/distributed/file_based/file_coordinator"),
            },
            // simple HTTP-based coordination
            http: {
                storage: require("./built/distributed/http_based/http_coordination_storage"),
                coordinator: require("./built/distributed/http_based/http_coordinator")
            }
        }
    },
    // some exposed utilities
    util: {
        // for logging stuff
        logging: require("./built/util/logger"),
        // for validating schema
        validation: require("./built/topology_validation"),
        // easier parsing of command line
        cmdline: require("./built/util/cmdline"),
        // of rmatching objects to certain pattern/query
        pattern_matcher: require("./built/util/pattern_matcher"),
        child_process_restarter: require("./built/util/child_proc_restarter")
    }
};
