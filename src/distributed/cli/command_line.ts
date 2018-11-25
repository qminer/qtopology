import * as fs from "fs";
import * as colors from "colors";
import * as intf from "../../topology_interfaces";
import * as vld from "../../topology_validation";
import * as log from "../../util/logger";
import * as cmdline from "../../util/cmdline";
import * as leader from "../topology_leader";
import * as strpc from "../../util/strip_json_comments";

//////////////////////////////////////////////////////////////////////

/**
 * This utility method handles/displays captured error
 * @param err - Error if captured
 * @param callback - Callback to call afterwards
 */
function handleError(err: Error, callback: intf.SimpleCallback) {
    if (err) {
        const logger = log.logger();
        logger.error("Error");
        logger.exception(err);
    }
    callback();
}

/** Class that handles command-line tool requests */
export class CommandLineHandler {

    /** Utility method that displays usage instructions */
    public static showHelp() {
        const logger = log.logger();
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

    private storage: intf.ICoordinationStorage;
    private params: string[];

    /** Simple constructor, requires storage to execute the commands on. */
    constructor(storage: intf.ICoordinationStorage, params?: string[]) {
        this.storage = storage;
        this.params = cmdline.parseCommandLine(params || process.argv.slice(2))._;
    }

    /**
     * Main method for running command-line tool.
     * @param callback - Callback to call when all is done
     */
    public run(callback: intf.SimpleCallback) {
        const params = this.params;
        if (params.length == 1 && params[0] == "help") {
            CommandLineHandler.showHelp();
            callback();
        } else if (params.length == 3 && params[0] == "register") {
            try {
                const config = strpc.readJsonFileSync(params[2]);
                try {
                    vld.validate({ config, exitOnError: false, throwOnError: true });
                } catch (e) {
                    return handleError(e, callback);
                }
                this.storage.registerTopology(params[1], config,err => {
                    handleError(err, callback);
                });
            } catch (e) {
                return handleError(e, callback);
            }
        } else if (params.length == 2 && params[0] == "enable") {
            this.storage.enableTopology(params[1],err => {
                handleError(err, callback);
            });
        } else if (params.length == 2 && params[0] == "disable") {
            this.storage.disableTopology(params[1],err => {
                handleError(err, callback);
            });
        } else if (params.length == 1 && params[0] == "list") {
            this.storage.getTopologyStatus((err, data: intf.ITopologyStatus[]) => {
                if (!err) {
                    const logger = log.logger();
                    for (const t of data) {
                        let status = t.status;
                        switch (status) {
                            case intf.CONSTS.TopologyStatus.running: status = colors.green(t.status); break;
                            case intf.CONSTS.TopologyStatus.error: status = colors.red(t.status); break;
                            case intf.CONSTS.TopologyStatus.waiting: status = colors.yellow(t.status); break;
                        }
                        const enabled = (t.enabled ? colors.green("enabled") : "disabled");
                        logger.info(`${t.uuid} (enabled: ${enabled}) (status: ${status}) (worker: ${t.worker})`);
                    }
                }
                handleError(err, callback);
            });
        } else if (params.length == 1 && params[0] == "workers") {
            this.storage.getWorkerStatus((err, data: intf.IWorkerStatus[]) => {
                if (!err) {
                    const logger = log.logger();
                    for (const t of data) {
                        const status = (t.status == intf.CONSTS.WorkerStatus.alive ? colors.green(t.status) : t.status);
                        const lstatus = (t.lstatus == intf.CONSTS.WorkerLStatus.leader ? colors.yellow("yes") : "no");
                        logger.info(`${t.name} (status: ${status}) (leader: ${lstatus}) (last status: ${t.last_ping_d.toLocaleString()})`);
                    }
                }
                handleError(err, callback);
            });
        } else if (params.length == 2 && params[0] == "details") {
            this.storage.getTopologyInfo(params[1], (err, t: intf.ITopologyInfoResponse) => {
                if (!err) {
                    const logger = log.logger();
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
        } else if (params.length == 3 && params[0] == "export") {
            this.storage.getTopologyInfo(params[1], (err, t: intf.ITopologyInfoResponse) => {
                if (!err) {
                    fs.writeFileSync(params[2], JSON.stringify(t.config, null, "    "), { encoding: "utf8" });
                }
                handleError(err, callback);
            });
        } else if (params.length == 2 && params[0] == "stop-topology") {
            this.storage.stopTopology(params[1],err => {
                handleError(err, callback);
            });
        } else if (params.length == 2 && params[0] == "clear-topology-error") {
            leader.TopologyLeader.clearTopologyError(params[1], this.storage,err => {
                handleError(err, callback);
            });
        } else if (params.length == 3 && params[0] == "set-topology-error") {
            this.storage.setTopologyStatus(params[1], null, intf.CONSTS.TopologyStatus.error, params[2],err => {
                handleError(err, callback);
            });
        } else if (params.length == 2 && params[0] == "shut-down-worker") {
            this.storage.sendMessageToWorker(params[1], intf.CONSTS.LeaderMessages.shutdown, {}, 60 * 1000,err => {
                handleError(err, callback);
            });
        } else {
            CommandLineHandler.showHelp();
            callback(new Error("Unsupported QTopology CLI command line: " + params.join(" ")));
        }
    }
}

export function runRepl(storage: intf.ICoordinationStorage) {
    const logger = log.logger();
    logger.info("");
    logger.important("Welcome to QTopology REPL.");
    logger.info("Type 'help' to display the list of commands");
    logger.info("");
    const repl = require("repl");
    repl.start({
        prompt: colors.yellow("\nrepl >") + " ",
        eval: (cmd, context, filename, callback) => {
            const dd = cmd.trim();
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

            const cmdh = new CommandLineHandler(storage, dd.split(" "));
            cmdh.run(callback);
        }
    });
}
