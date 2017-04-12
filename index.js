"use strict";

module.exports = {
    // used for nodes that run in subprocess
    child: require("./src/topology_node"),
    // used for running single local topology in same process
    local: require("./src/topology_local"),
    // when running fully capable topology workers
    distributed: {
        // for single worker
        worker: require("./src/distributed/topology_worker"),
        // std coordination providers
        std_coordinators: {
            // simple file-based coordination
            file: {
                coordinator: require("./src/distributed/file_based/file_coordinator"),
            },
            // simple HTTP-based coordination
            http: {
                storage: require("./src/distributed/http_based/http_coordination_storage"),
                coordinator: require("./src/distributed/http_based/http_coordinator")
            }
        }
    },
    // some exposed utilities
    util: {
        // easier parsing of command line
        cmdline: require("./src/util/cmdline")
    }
};
