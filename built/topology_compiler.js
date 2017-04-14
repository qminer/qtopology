"use strict";
/** Helper function for injecting the variables in ${VARNAME} location.
 * Case-insensitive.
 */
function injectVars(target, vars) {
    if (target) {
        if (typeof target == "string") {
            for (var v in vars) {
                if (vars.hasOwnProperty(v)) {
                    target = target.replace(new RegExp("\\${" + v + "}", "i"), vars[v]);
                }
            }
        }
        else if (typeof target === 'object') {
            for (var f in target) {
                if (target.hasOwnProperty(f)) {
                    target[f] = injectVars(target[f], vars);
                }
            }
        }
    }
    return target;
}
/** Main class - checks and compiles the topology */
var TopologyCompiler = (function () {
    /** Simple constructor, receives the topology. */
    function TopologyCompiler(topology_config) {
        this._config = JSON.parse(JSON.stringify(topology_config));
    }
    /** Checks and compiles the topology. */
    TopologyCompiler.prototype.compile = function () {
        var vars = this._config.variables || {};
        if (this._config.general.initialization) {
            for (var _i = 0, _a = this._config.general.initialization; _i < _a.length; _i++) {
                var init_top = _a[_i];
                init_top.working_dir = injectVars(init_top.working_dir, vars);
                if (init_top.init) {
                    init_top.init = injectVars(init_top.init, vars);
                }
            }
        }
        if (this._config.general.shutdown) {
            for (var _b = 0, _c = this._config.general.shutdown; _b < _c.length; _b++) {
                var shutdown_top = _c[_b];
                shutdown_top.working_dir = injectVars(shutdown_top.working_dir, vars);
                if (shutdown_top.init) {
                    shutdown_top.init = injectVars(shutdown_top.init, vars);
                }
            }
        }
        var names = {};
        for (var _d = 0, _e = this._config.spouts; _d < _e.length; _d++) {
            var spout = _e[_d];
            if (names[spout.name]) {
                throw new Error("Spout name '" + spout.name + "' occurs several times.");
            }
            names[spout.name] = true;
            // inject variables
            spout.working_dir = injectVars(spout.working_dir, vars);
            spout.cmd = injectVars(spout.cmd, vars);
            spout.init = injectVars(spout.init, vars);
        }
        for (var _f = 0, _g = this._config.bolts; _f < _g.length; _f++) {
            var bolt = _g[_f];
            if (names[bolt.name]) {
                throw new Error("Bolt name '" + bolt.name + "' occurs several times. Could also be spout's name.");
            }
            names[bolt.name] = true;
            // inject variables
            bolt.working_dir = injectVars(bolt.working_dir, vars);
            bolt.cmd = injectVars(bolt.cmd, vars);
            bolt.init = injectVars(bolt.init, vars);
        }
        // check bolt inputs
        this._config.bolts.forEach(function (bolt) {
            for (var _i = 0, _a = bolt.inputs; _i < _a.length; _i++) {
                var input = _a[_i];
                if (!names[input.source]) {
                    throw new Error("Bolt '" + bolt.name + "' is using unknown input source '" + input.source + "'.");
                }
            }
        });
    };
    /** Returns compiled configuration . */
    TopologyCompiler.prototype.getWholeConfig = function () {
        return JSON.parse(JSON.stringify(this._config));
    };
    return TopologyCompiler;
}());
/////////////////////////////////////////////////////////////////////////////
exports.TopologyCompiler = TopologyCompiler;
