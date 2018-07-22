/** Main class - checks and compiles the topology */
export declare class TopologyCompiler {
    private config;
    /** Simple constructor, receives the topology. */
    constructor(topology_config: any);
    /** Checks and compiles the topology. */
    compile(): void;
    /** Returns compiled configuration . */
    getWholeConfig(): any;
    /** Resolves all references to variables within variables */
    private resolveAllVars(vars);
}
