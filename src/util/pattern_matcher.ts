class SingleFilter {
    public $like: RegExp[];
    public values: any[];
    public fields: string[];
}

/** Simple class for pattern matching */
export class PaternMatcher {

    private pattern: any;
    private filters: SingleFilter[];

    /** Constructor that receives pattern as object */
    constructor(pattern: any) {
        this.pattern = JSON.parse(JSON.stringify(pattern));
        this.filters = [];
        // prepare RegEx objects in advance
        for (const filter in this.pattern) {
            if (this.pattern.hasOwnProperty(filter)) {
                const curr = this.pattern[filter];
                const rec = new SingleFilter();
                rec.fields = filter.split(".");
                if (typeof (curr) == "object" && curr.$like) {
                    rec.$like = [];
                    if (Array.isArray(curr.$like)) {
                        for (const like of curr.$like) {
                            rec.$like.push(new RegExp(like));
                        }
                    } else if (typeof (curr.$like) == "string") {
                        rec.$like.push(new RegExp(curr.$like));
                    }
                } else {
                    if (Array.isArray(curr)) {
                        rec.values = curr;
                    } else {
                        rec.values = [curr];
                    }
                }
                this.filters.push(rec);
            }
        }
    }

    /** Simple procedure for checking if given item
     *  matches the pattern.
     */
    public isMatch(item: any) {
        for (const filter of this.filters) {
            if (!this.matchSingleFilter(item, filter)) {
                return false;
            }
        }
        return true;
    }

    private matchSingleFilter(item: any, filter: SingleFilter): boolean {
        let target_value = item;
        for (const field of filter.fields) {
            if (target_value[field] === undefined) {
                return false;
            }
            target_value = target_value[field];
        }

        if (filter.values) {
            for (const val of filter.values) {
                if (target_value === val) {
                    return true;
                }
            }
        } else {
            for (const like of filter.$like) {
                if (like.test(target_value)) {
                    return true;
                }
            }
        }
        return false;
    }
}

