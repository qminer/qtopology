"use strict";

/** Helper function for injecting the variables in ${VARNAME} location.
 * Case-insensitive.
 */
function injectVars(target, vars) {
    for (let v in vars) {
        if (vars.hasOwnProperty(v)) {
            target = target.replace(new RegExp("\\${" + v + "}", "i"), vars[v]);
        }
    }
    return target;
}

/** Main class - checks and compiles the topology */
class TopologyCompiler {

    /** Simple constructor, receives the topology. */
    constructor(topology_config) {
        this._config = JSON.parse(JSON.stringify(topology_config));
        this._per_worker = {};
        this._worker_names = [];
    }

    /** Checks and compiles the topology. */
    compile() {
        let workers = {};
        let vars = this._config.variables || {};
        for (let worker of this._config.workers) {
            let name = worker.name;
            if (workers[name]) {
                throw new Error(`Worker name '${worker.name}' occurs several times.`);
            }
            workers[name] = true;
            this._worker_names.push(name);
        }

        let names = {};
        for (let spout of this._config.spouts) {
            if (names[spout.name]) {
                throw new Error(`Spout name '${spout.name}' occurs several times.`);
            }
            if (workers[spout.name]) {
                throw new Error(`Spout name '${spout.name}' occurs is already used for worker name.`);
            }
            // check worker name
            if (!workers[spout.worker]) {
                throw new Error(`Spout '${spout.name}' refers to unknown worker '${spout.worker}'`);
            }
            names[spout.name] = true;
            // inject variables
            spout.working_dir = injectVars(spout.working_dir, vars);
            spout.cmd = injectVars(spout.cmd, vars);
        }

        for (let bolt of this._config.bolts) {
            if (names[bolt.name]) {
                throw new Error(`Bolt name '${bolt.name}' occurs several times. Could also be spout's name.`);
            }
            if (workers[bolt.name]) {
                throw new Error(`Bolt name '${bolt.name}' occurs is already used for worker name.`);
            }
            // check worker name
            if (!workers[bolt.worker]) {
                throw new Error(`Bolt '${bolt.name}' refers to unknown worker '${bolt.worker}'`);
            }
            names[bolt.name] = true;
            // inject variables
            bolt.working_dir = injectVars(bolt.working_dir, vars);
            bolt.cmd = injectVars(bolt.cmd, vars);
        }

        // check bolt inputs
        this._config.workers.forEach((worker) => {
            let name = worker.name;
            this._per_worker[name] = {
                spouts: this._config.spouts.filter(x => x.worker == name),
                bolts: this._config.bolts.filter(x => x.worker == name)
            };
        });

        // check bolt inputs
        this._config.bolts.forEach((bolt) => {
            for (let input of bolt.inputs) {
                if (!names[input.source]) {
                    throw new Error(`Bolt '${bolt.name}' is using unknown input source '${input.source}'.`);
                }
            }
        });
    }

    /** Returns compiled configurations for all workers. */
    getConfigsAllWorkers() {
        return JSON.parse(JSON.stringify(this._per_worker));
    }

    /** Returns compiled configuration for specific worker. */
    getConfigForWorker(name) {
        return JSON.parse(JSON.stringify(this._per_worker[name]));
    }

    /** Returns names of workers. */
    getWorkerNames() {
        return this._worker_names.slice(0); // return a copy
    }

    /** Sets worker address after it registers with coordinator */
    setWorkerAddress(name, address) {
        for (let worker of this._config.workers) {
            if (worker.name == name) {
                worker.address = address;
                return;
            }
        }
    }
}

/////////////////////////////////////////////////////////////////////////////

exports.TopologyCompiler = TopologyCompiler;
