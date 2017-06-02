import * as path from "path";
import * as fs from "fs";
import * as intf from "../../topology_interfaces";
import * as log from "../../util/logger";

//////////////////////////////////////////////////////////////////////

function handleError(err: Error, callback: intf.SimpleCallback) {
    if (err) {
        let logger = log.logger();
        logger.error("Error");
        logger.exception(err);
    }
    callback(err);
}

export class CommandLineHandler {

    private storage: intf.CoordinationStorage;

    constructor(storage: intf.CoordinationStorage) {
        this.storage = storage;
    }

    run(callback: intf.SimpleCallback) {
        let params = process.argv.slice(2);
        if (params.length == 2 && params[0] == "register") {
            fs.readFile(params[1], "utf8", (err, content) => {
                if (err) return handleError(err, callback);
                let config = JSON.parse(content);
                this.storage.registerTopology(content, true, (err) => {
                    handleError(err, callback);
                });
            });
        } else if (params.length == 2 && params[0] == "enable") {
            this.storage.enableTopology(params[1], (err) => {
                handleError(err, callback);
            });
        } else if (params.length == 2 && params[0] == "disable") {
            this.storage.disableTopology(params[1], (err) => {
                handleError(err, callback);
            });
        } else {
            this.showHelp();
            callback();
        }
    }

    private showHelp() {
        let logger = log.logger();
        logger.important("QTopology CLI usage");
        logger.info("register <file_name> - registers new topology");
        logger.info("enable <topology_uuid> - enables topology");
        logger.info("disable <topology_uuid> - disables topology");
    }
}
