import * as path from "path";
import * as fs from "fs";
import * as intf from "../../topology_interfaces";
import * as vld from "../../topology_validation";
import * as log from "../../util/logger";

//////////////////////////////////////////////////////////////////////

function handleError(err: Error) {
    if (err) {
        let logger = log.logger();
        logger.error("Error");
        logger.exception(err);
    }
}

export class CommandLineHandler {

    private storage: intf.CoordinationStorage;

    constructor(storage: intf.CoordinationStorage) {
        this.storage = storage;
    }

    run() {
        let params = process.argv.slice(2);
        if (params.length == 3 && params[0] == "register") {
            fs.readFile(params[2], "utf8", (err, content) => {
                if (err) return handleError(err);
                let config = JSON.parse(content);
                try {
                    vld.validate({ config: config, exitOnError: false, throwOnError: true });
                } catch (e) {
                    return handleError(e);
                }
                this.storage.registerTopology(params[1],config, (err) => {
                    handleError(err);
                });
            });
        } else if (params.length == 2 && params[0] == "enable") {
            this.storage.enableTopology(params[1], (err) => {
                handleError(err);
            });
        } else if (params.length == 2 && params[0] == "disable") {
            this.storage.disableTopology(params[1], (err) => {
                handleError(err);
            });
        } else {
            this.showHelp();
        }
    }

    private showHelp() {
        let logger = log.logger();
        logger.important("QTopology CLI usage");
        logger.info("register <uuid> <file_name> - registers new topology");
        logger.info("enable <topology_uuid> - enables topology");
        logger.info("disable <topology_uuid> - disables topology");
    }
}
