export function parseCommandLine(argv: string[]): any {
    const res = { _: [] };

    let last_switch = null;
    for (const curr of argv) {
        if (curr.slice(0, 2) == "--") {
            last_switch = curr.slice(2);
            res[last_switch] = true;
        } else if (curr.slice(0, 1) == "-") {
            last_switch = curr.slice(1);
            res[last_switch] = true;
        } else if (last_switch) {
            res[last_switch] = curr;
            last_switch = null;
        } else {
            res._.push(curr);
        }
    }

    return res;
}

export function parseCommandLineEx(argv: string[], map: any): any {
    map = map || {};
    const res = parseCommandLine(argv);
    for (const field in map) {
        if (map.hasOwnProperty(field) && res[field]) {
            res[map[field]] = res[field];
        }
    }
    return res;
}

export class OptionsDescription {
    public shortname: string;
    public name: string;
    public default: string | number;
    public text: string;
    public target: string;
    public flag: string;
}

export class CmdLineParser {

    private shortnames: Map<string, OptionsDescription>;
    private names: Map<string, OptionsDescription>;
    private descriptions: OptionsDescription[];

    constructor() {
        this.shortnames = new Map<string, OptionsDescription>();
        this.names = new Map<string, OptionsDescription>();
        this.descriptions = [];
    }

    public clear() {
        this.shortnames.clear();
        this.names.clear();
        this.descriptions = [];
    }

    public areFlags(letters: string) {
        for (let k = 0; k < letters.length; k++) {
            const letter = letters[k];
            if (!this.shortnames[letter] || !this.shortnames[letter].flag) {
                return false;
            }
        }
        return true;
    }

    public getValue(text: string): number | string {
        if (!text) {
            return null;
        }
        for (let k = 0; k < text.length; k++) {
            if (text[k] < "0" || text[k] > "9") {
                return text;
            }
        }
        return parseInt(text, 10);
    }

    public getTargetName(name: string, description: OptionsDescription): string {
        if (!description) {
            return name;
        }
        if (description.target) {
            return description.target;
        }
        return description.name;
    }

    public define(shortname: string, name: string, defaultValue: string | number, text: string, options?: any) {
        options = options || {};

        const description = {
            default: defaultValue,
            flag: null,
            name,
            shortname,
            target: null,
            text
        };
        if (options.name) {
            description.target = options.name;
        }
        if (options.flag) {
            description.flag = true;
        }

        this.descriptions.push(description);
        this.names[name] = description;
        this.shortnames[shortname] = description;
        return this;
    }

    public process(args: string[]): any {
        const opts = {};

        this.descriptions.forEach(description => {
            if (description.default) {
                opts[this.getTargetName(null, description)] = description.default;
            }
        });

        for (let k = 0; k < args.length; k++) {
            const arg = args[k];
            if (arg.length > 2 && arg[0] == "-" && arg[1] == "-") {
                const name = arg.slice(2);
                const description = this.names[name];
                if (description && description.flag) {
                    opts[this.getTargetName(name, description)] = true;
                } else {
                    k++;
                    const val = this.getValue(args[k]);
                    opts[this.getTargetName(name, description)] = val;
                }
            } else if (arg.length > 1 && arg[0] == "-") {
                const shortname = arg.slice(1);
                let description = this.shortnames[shortname];
                if (!description && this.areFlags(shortname)) {
                    for (let j = 0; j < shortname.length; j++) {
                        const letter = this.shortnames[j];
                        description = this.shortnames[letter];
                        opts[this.getTargetName(letter, description)] = true;
                    }
                    continue;
                }

                if (description && description.flag) {
                    opts[this.getTargetName(shortname, description)] = true;
                } else {
                    k++;
                    const val = this.getValue(args[k]);
                    opts[this.getTargetName(shortname, description)] = val;
                }
            }
        }
        return opts;
    }
}
