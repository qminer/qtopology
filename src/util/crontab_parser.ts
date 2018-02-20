
export class CronTabParser {

    private parts: number[][];
    private simple_regex: RegExp;
    private dow_regex: RegExp;

    constructor(s: string) {
        this.simple_regex = /^\*|\d\d?(\-\d\d?)?$/;
        this.dow_regex = /^(sun|mon|tue|wed|thu|fri|sat)(\-(sun|mon|tue|wed|thu|fri|sat))?$/;
        let parts = s.split(" ");
        if (parts.length != 6) {
            throw new Error(`Invalid CRON string: ${s} - ${JSON.stringify(parts)}`);
        }
        this.parts = [];
        for (let i = 0; i < parts.length; i++) {
            let p = parts[i].toLowerCase();
            if (i == 5 && this.dow_regex.test(p)) {
                // support for day-of-week enumeration
                ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].forEach((x, index) => {
                    p = p
                        .replace(x, "" + index)
                        .replace(x, "" + index); // do this twice, just in case someone sent in same-day- range, e.g. wed-wed
                });
            }
            if (!this.simple_regex.test(p)) {
                throw new Error(`Invalid CRON string: ${p}`);
            }
            if (p == "*") {
                this.parts.push([]);
            } else if (p.indexOf("-") > 0) {
                let tmp = p.split("-");
                this.parts.push([+tmp[0], +tmp[1]]);
            } else {
                this.parts.push([+p, +p]);
            }
        }
    }

    private miniTest(val: number, bounds: number[]): boolean {
        if (bounds.length > 0) {
            if (val < bounds[0] || val > bounds[1]) {
                return false;
            }
        }
        return true;
    }

    isIncluded(target: Date): boolean {
        let res =
            this.miniTest(target.getSeconds(), this.parts[0]) &&
            this.miniTest(target.getMinutes(), this.parts[1]) &&
            this.miniTest(target.getHours(), this.parts[2]) &&
            this.miniTest(target.getDate(), this.parts[3]) &&
            this.miniTest(target.getMonth() + 1, this.parts[4]) &&
            this.miniTest(target.getDay(), this.parts[5]);
        return res;
    }
}
