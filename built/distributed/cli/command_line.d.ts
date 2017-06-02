import * as intf from "../../topology_interfaces";
/** Class that handles command-line tool requests */
export declare class CommandLineHandler {
    private storage;
    /** Simple constructor, requires storage to execute the commands on. */
    constructor(storage: intf.CoordinationStorage);
    /**
     * Main method for running command-line tool.
     * @param callback - Callback to call when all is done
     */
    run(callback: intf.SimpleCallback): void;
    /** Utility method that displays usage instructions */
    private showHelp();
}
