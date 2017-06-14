"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validator = require("./topology_validation");
/** Helper function for injecting the variables in ${VARNAME} location.
 * Case-insensitive.
 */
function injectVars(target, vars) {
    if (target) {
        if (typeof target == "string") {
            for (let v in vars) {
                if (vars.hasOwnProperty(v)) {
                    target = target.replace(new RegExp("\\${" + v + "}", "i"), vars[v]);
                }
            }
        }
        else if (typeof target === 'object') {
            for (let f in target) {
                if (target.hasOwnProperty(f)) {
                    target[f] = injectVars(target[f], vars);
                }
            }
        }
    }
    return target;
}
/** Main class - checks and compiles the topology */
class TopologyCompiler {
    /** Simple constructor, receives the topology. */
    constructor(topology_config) {
        this.config = JSON.parse(JSON.stringify(topology_config));
    }
    /** Checks and compiles the topology. */
    compile() {
        // first validate the definition
        validator.validate({
            config: this.config,
            exitOnError: false,
            throwOnError: true
        });
        let vars = this.config.variables || {};
        this.resolveAllVars(vars);
        if (this.config.general.initialization) {
            for (let init_top of this.config.general.initialization) {
                init_top.working_dir = injectVars(init_top.working_dir, vars);
                if (init_top.init) {
                    init_top.init = injectVars(init_top.init, vars);
                }
            }
        }
        if (this.config.general.shutdown) {
            for (let shutdown_top of this.config.general.shutdown) {
                shutdown_top.working_dir = injectVars(shutdown_top.working_dir, vars);
                if (shutdown_top.init) {
                    shutdown_top.init = injectVars(shutdown_top.init, vars);
                }
            }
        }
        let names = {};
        for (let spout of this.config.spouts) {
            if (names[spout.name]) {
                throw new Error(`Spout name '${spout.name}' occurs several times.`);
            }
            names[spout.name] = true;
            // inject variables
            spout.working_dir = injectVars(spout.working_dir, vars);
            spout.cmd = injectVars(spout.cmd, vars);
            spout.init = injectVars(spout.init, vars);
        }
        for (let bolt of this.config.bolts) {
            if (names[bolt.name]) {
                throw new Error(`Bolt name '${bolt.name}' occurs several times. Could also be spout's name.`);
            }
            names[bolt.name] = true;
            // inject variables
            bolt.working_dir = injectVars(bolt.working_dir, vars);
            bolt.cmd = injectVars(bolt.cmd, vars);
            bolt.init = injectVars(bolt.init, vars);
        }
        // check bolt inputs
        this.config.bolts.forEach((bolt) => {
            for (let input of bolt.inputs) {
                if (!names[input.source]) {
                    throw new Error(`Bolt '${bolt.name}' is using unknown input source '${input.source}'.`);
                }
            }
        });
    }
    /** Returns compiled configuration . */
    getWholeConfig() {
        return JSON.parse(JSON.stringify(this.config));
    }
    /** Resolves all references to variables within variables */
    resolveAllVars(vars) {
        injectVars(vars, vars);
    }
}
exports.TopologyCompiler = TopologyCompiler;
//# sourceMappingURL=topology_compiler.js.map