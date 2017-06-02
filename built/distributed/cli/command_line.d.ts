import * as intf from "../../topology_interfaces";
export declare class CommandLineHandler {
    private storage;
    constructor(storage: intf.CoordinationStorage);
    run(): void;
    private showHelp();
}
