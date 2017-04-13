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
            var init_top = this._config.general.initialization;
            if (init_top.init) {
                init_top.init = injectVars(init_top.init, vars);
            }
        }
        var names = {};
        for (var _i = 0, _a = this._config.spouts; _i < _a.length; _i++) {
            var spout = _a[_i];
            if (names[spout.name]) {
                throw new Error("Spout name '" + spout.name + "' occurs several times.");
            }
            names[spout.name] = true;
            // inject variables
            spout.working_dir = injectVars(spout.working_dir, vars);
            spout.cmd = injectVars(spout.cmd, vars);
            spout.init = injectVars(spout.init, vars);
        }
        for (var _b = 0, _c = this._config.bolts; _b < _c.length; _b++) {
            var bolt = _c[_b];
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
