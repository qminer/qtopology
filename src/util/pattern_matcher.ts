
class SingleFilter {
    $like: RegExp[];
    values: any[];
    fields: string[];
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
        for (let filter in this.pattern) {
            if (this.pattern.hasOwnProperty(filter)) {
                let curr = this.pattern[filter];
                let rec = new SingleFilter();
                rec.fields = filter.split(".");
                if (typeof (curr) == "object" && curr.$like) {
                    rec.$like = [];
                    if (Array.isArray(curr.$like)) {
                        for (let i = 0; i < curr.$like.length; i++) {
                            rec.$like.push(new RegExp(curr.$like[i]));
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

    private matchSingleFilter(item: any, filter: SingleFilter): boolean {
        let target_value = item;
        for (let field of filter.fields) {
            if (target_value[field] === undefined) {
                return false;
            }
            target_value = target_value[field];
        }

        if (filter.values) {
            let match = false;
            for (let val of filter.values) {
                if (target_value === val) {
                    return true;
                }
            }
        } else {
            let match = false;
            for (let like of filter.$like) {
                if (like.test(target_value)) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Simple procedure for checking if given item
     *  matches the pattern.
     */
    isMatch(item: any) {
        for (let filter of this.filters) {
            if (!this.matchSingleFilter(item, filter)) {
                return false;
            }
        }
        return true;
    }
}
