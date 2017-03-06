"use strict";

module.exports = {
    child: require("./src/topology_node"),
    local: require("./src/topology_local"),
    worker: require("./src/topology_worker"),
    coordinator: require("./src/topology_coordinator"),    
    validation: require("./src/topology_validation")
};
