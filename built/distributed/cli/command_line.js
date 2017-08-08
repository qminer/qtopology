"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const vld = require("../../topology_validation");
const log = require("../../util/logger");
const cmdline = require("../../util/cmdline");
//////////////////////////////////////////////////////////////////////
/**
 * This utility method handles/displays captured error
 * @param err - Error if captured
 * @param callback - Callback to call afterwards
 */
function handleError(err, callback) {
    if (err) {
        let logger = log.logger();
        logger.error("Error");
        logger.exception(err);
    }
    callback();
}
/** Class that handles command-line tool requests */
class CommandLineHandler {
    /** Simple constructor, requires storage to execute the commands on. */
    constructor(storage, params) {
        this.storage = storage;
        this.params = cmdline.parseCommandLine(params || process.argv.slice(2))._;
    }
    /**
     * Main method for running command-line tool.
     * @param callback - Callback to call when all is done
     */
    run(callback) {
        let params = this.params;
        if (params.length == 3 && params[0] == "register") {
            fs.readFile(params[2], "utf8", (err, content) => {
                if (err)
                    return handleError(err, callback);
                let config = JSON.parse(content);
                try {
                    vld.validate({ config: config, exitOnError: false, throwOnError: true });
                }
                catch (e) {
                    return handleError(e, callback);
                }
                this.storage.registerTopology(params[1], config, (err) => {
                    handleError(err, callback);
                });
            });
        }
        else if (params.length == 2 && params[0] == "enable") {
            this.storage.enableTopology(params[1], (err) => {
                handleError(err, callback);
            });
        }
        else if (params.length == 2 && params[0] == "disable") {
            this.storage.disableTopology(params[1], (err) => {
                handleError(err, callback);
            });
        }
        else if (params.length == 2 && params[0] == "stop-topology") {
            this.storage.stopTopology(params[1], (err) => {
                handleError(err, callback);
            });
        }
        else if (params.length == 2 && params[0] == "clear-topology-error") {
            this.storage.clearTopologyError(params[1], (err) => {
                handleError(err, callback);
            });
        }
        else if (params.length == 2 && params[0] == "shut-down-worker") {
            this.storage.shutDownWorker(params[1], (err) => {
                handleError(err, callback);
            });
        }
        else {
            this.showHelp();
            callback(new Error("Unsupported QTopology CLI command line: " + params.join(" ")));
        }
    }
    /** Utility method that displays usage instructions */
    showHelp() {
        let logger = log.logger();
        logger.important("QTopology CLI usage");
        logger.info("register <uuid> <file_name> - registers new topology");
        logger.info("enable <topology_uuid> - enables topology");
        logger.info("disable <topology_uuid> - disables topology");
        logger.info("stop-topology <topology_uuid> - stops and disables topology");
        logger.info("clear-topology-error <topology_uuid> - clears error flag for topology");
        logger.info("shut-down-worker <worker_name> - sends shutdown signal to specified worker");
    }
}
exports.CommandLineHandler = CommandLineHandler;
//# sourceMappingURL=command_line.js.map