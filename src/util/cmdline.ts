
export class OptionsDescription {
    shortname: string;
    name: string;
    default: string | number;
    text: string;
    target: string;
    flag: string;
}

export class CmdLineParser {

    shortnames: Map<string, OptionsDescription>;
    names: Map<string, OptionsDescription>;
    descriptions: OptionsDescription[];

    constructor() {
        this.shortnames = new Map<string, OptionsDescription>();
        this.names = new Map<string, OptionsDescription>();
        this.descriptions = [];
    }

    clear() {
        this.shortnames.clear();
        this.names.clear();
        this.descriptions = [];
    }

    areFlags(letters: string) {
        for (let k = 0; k < letters.length; k++) {
            let letter = letters[k];
            if (!this.shortnames[letter] || !this.shortnames[letter].flag) {
                return false;
            }
        }
        return true;
    }

    getValue(text: string): number | string {
        if (!text) {
            return null;
        }
        for (let k = 0; k < text.length; k++) {
            if (text[k] < '0' || text[k] > '9') {
                return text;
            }
        }
        return parseInt(text);
    }

    getTargetName(name: string, description: OptionsDescription): string {
        if (!description) {
            return name;
        }
        if (description.target) {
            return description.target;
        }
        return description.name;
    }

    define(shortname: string, name: string, defaultValue: string | number, text: string, options?: any) {
        options = options || {};

        let description = {
            shortname: shortname,
            name: name,
            default: defaultValue,
            text: text,
            target: null,
            flag: null
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

    process(args: string[]): any {
        let opts = {};

        this.descriptions.forEach((description) => {
            if (description.default) {
                opts[this.getTargetName(null, description)] = description.default;
            }
        });

        for (let k = 0; k < args.length; k++) {
            let arg = args[k];
            if (arg.length > 2 && arg[0] == '-' && arg[1] == '-') {
                let name = arg.slice(2);
                let description = this.names[name];
                if (description && description.flag) {
                    opts[this.getTargetName(name, description)] = true;
                } else {
                    k++;
                    let val = this.getValue(args[k]);
                    opts[this.getTargetName(name, description)] = val;
                }
            } else if (arg.length > 1 && arg[0] == '-') {
                let shortname = arg.slice(1);
                let description = this.shortnames[shortname];
                if (!description && this.areFlags(shortname)) {
                    for (let k = 0; k < shortname.length; k++) {
                        let letter = this.shortnames[k];
                        description = this.shortnames[letter];
                        opts[this.getTargetName(letter, description)] = true;
                    }
                    continue;
                }

                if (description && description.flag) {
                    opts[this.getTargetName(shortname, description)] = true;
                } else {
                    k++;
                    let val = this.getValue(args[k]);
                    opts[this.getTargetName(shortname, description)] = val;
                }
            }
        }
        return opts;
    }
}
