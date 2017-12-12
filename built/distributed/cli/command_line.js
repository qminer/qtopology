"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const colors = require("colors");
const intf = require("../../topology_interfaces");
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
        if (params.length == 1 && params[0] == "help") {
            CommandLineHandler.showHelp();
            callback();
        }
        else if (params.length == 3 && params[0] == "register") {
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
        else if (params.length == 1 && params[0] == "list") {
            this.storage.getTopologyStatus((err, data) => {
                if (!err) {
                    let logger = log.logger();
                    for (let t of data) {
                        let status = t.status;
                        switch (status) {
                            case intf.Consts.TopologyStatus.running:
                                status = colors.green(t.status);
                                break;
                            case intf.Consts.TopologyStatus.error:
                                status = colors.red(t.status);
                                break;
                            case intf.Consts.TopologyStatus.waiting:
                                status = colors.yellow(t.status);
                                break;
                        }
                        ;
                        let enabled = (t.enabled ? colors.green("enabled") : "disabled");
                        logger.info(`${t.uuid} (enabled: ${enabled}) (status: ${status}) (worker: ${t.worker})`);
                    }
                }
                handleError(err, callback);
            });
        }
        else if (params.length == 1 && params[0] == "workers") {
            this.storage.getWorkerStatus((err, data) => {
                if (!err) {
                    let logger = log.logger();
                    for (let t of data) {
                        let status = (t.status == intf.Consts.WorkerStatus.alive ? colors.green(t.status) : t.status);
                        let lstatus = (t.lstatus == intf.Consts.WorkerLStatus.leader ? colors.yellow("yes") : "no");
                        logger.info(`${t.name} (status: ${status}) (leader: ${lstatus}) (last status: ${t.last_ping_d.toLocaleString()})`);
                    }
                }
                handleError(err, callback);
            });
        }
        else if (params.length == 2 && params[0] == "details") {
            this.storage.getTopologyInfo(params[1], (err, t) => {
                if (!err) {
                    let logger = log.logger();
                    logger.important(`Topology uuid=${t.uuid}`);
                    logger.info(`Enabled: ${t.enabled}`);
                    logger.info(`Status: ${t.status}`);
                    logger.info(`Worker: ${t.worker}`);
                    logger.info(`Worker affinity: ${t.worker_affinity}`);
                    logger.info(`Weight: ${t.weight}`);
                    logger.info(`Error: ${t.error}`);
                }
                handleError(err, callback);
            });
        }
        else if (params.length == 3 && params[0] == "export") {
            this.storage.getTopologyInfo(params[1], (err, t) => {
                if (!err) {
                    fs.writeFileSync(params[2], JSON.stringify(t.config, null, "    "), { encoding: "utf8" });
                }
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
        else if (params.length == 3 && params[0] == "set-topology-error") {
            this.storage.setTopologyStatus(params[1], null, intf.Consts.TopologyStatus.error, params[2], (err) => {
                handleError(err, callback);
            });
        }
        else if (params.length == 2 && params[0] == "shut-down-worker") {
            this.storage.shutDownWorker(params[1], (err) => {
                handleError(err, callback);
            });
        }
        else {
            CommandLineHandler.showHelp();
            callback(new Error("Unsupported QTopology CLI command line: " + params.join(" ")));
        }
    }
    /** Utility method that displays usage instructions */
    static showHelp() {
        let logger = log.logger();
        logger.important("QTopology CLI usage");
        logger.info("register <uuid> <file_name> - registers new topology");
        logger.info("enable <topology_uuid> - enables topology");
        logger.info("disable <topology_uuid> - disables topology");
        logger.info("stop-topology <topology_uuid> - stops and disables topology");
        logger.info("clear-topology-error <topology_uuid> - clears error flag for topology");
        logger.info("set-topology-error <topology_uuid> <error_text> - sets error flag for topology with given error");
        logger.info("shut-down-worker <worker_name> - sends shutdown signal to specified worker");
        logger.info("workers - display a list of all workers");
        logger.info("list - display a list of all registered topologies");
        logger.info("details <topology_uuid> - display details about given topology");
        logger.info("export <topology_uuid> <output_file> - export topology definition to file");
    }
}
exports.CommandLineHandler = CommandLineHandler;
function runRepl(storage) {
    let logger = log.logger();
    logger.info("");
    logger.important("Welcome to QTopology REPL.");
    logger.info("Type 'help' to display the list of commands");
    logger.info("");
    const repl = require('repl');
    repl.start({
        prompt: colors.yellow('\nrepl >') + " ",
        eval: (cmd, context, filename, callback) => {
            let dd = cmd.trim();
            if (dd == "exit" || dd == "quit" || dd == "gtfo") {
                logger.warn("Exiting...");
                process.exit(0);
            }
            if (dd == "wtf") {
                logger.info("This is QTopology REPL. Thank you. Type 'exit' to exit.");
                return callback();
            }
            if (dd == "") {
                return callback();
            }
            let cmdh = new CommandLineHandler(storage, dd.split(" "));
            cmdh.run(callback);
        }
    });
}
exports.runRepl = runRepl;
//# sourceMappingURL=command_line.js.map