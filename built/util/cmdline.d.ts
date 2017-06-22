export declare function parseCommandLine(argv: string[]): any;
export declare function parseCommandLineEx(argv: string[], map: any): any;
export declare class OptionsDescription {
    shortname: string;
    name: string;
    default: string | number;
    text: string;
    target: string;
    flag: string;
}
export declare class CmdLineParser {
    private shortnames;
    private names;
    private descriptions;
    constructor();
    clear(): void;
    areFlags(letters: string): boolean;
    getValue(text: string): number | string;
    getTargetName(name: string, description: OptionsDescription): string;
    define(shortname: string, name: string, defaultValue: string | number, text: string, options?: any): this;
    process(args: string[]): any;
}
