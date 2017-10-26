"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SingleFilter {
}
/** Simple class for pattern matching */
class PaternMatcher {
    /** Constructor that receives pattern as object */
    constructor(pattern) {
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
                    }
                    else if (typeof (curr.$like) == "string") {
                        rec.$like.push(new RegExp(curr.$like));
                    }
                }
                else {
                    if (Array.isArray(curr)) {
                        rec.values = curr;
                    }
                    else {
                        rec.values = [curr];
                    }
                }
                this.filters.push(rec);
            }
        }
    }
    matchSingleFilter(item, filter) {
        let target_value = item;
        for (let field of filter.fields) {
            if (target_value[field] === undefined) {
                return false;
            }
            target_value = target_value[field];
        }
        if (filter.values) {
            for (let val of filter.values) {
                if (target_value === val) {
                    return true;
                }
            }
        }
        else {
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
    isMatch(item) {
        for (let filter of this.filters) {
            if (!this.matchSingleFilter(item, filter)) {
                return false;
            }
        }
        return true;
    }
}
exports.PaternMatcher = PaternMatcher;
//# sourceMappingURL=pattern_matcher.js.map