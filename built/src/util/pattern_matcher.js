"use strict";
/** Simple class for pattern matching */
var PaternMatcher = (function () {
    /** Constructor that receives pattern as object */
    function PaternMatcher(pattern) {
        this.pattern = JSON.parse(JSON.stringify(pattern));
        // prepare RegEx objects in advance
        for (var filter in this.pattern) {
            if (this.pattern.hasOwnProperty(filter)) {
                var curr = this.pattern[filter];
                if (typeof (curr) == "object" && curr.$like) {
                    if (Array.isArray(curr.$like)) {
                        for (var i = 0; i < curr.$like.length; i++) {
                            curr.$like[i] = new RegExp(curr.$like[i]);
                        }
                    }
                    else if (typeof (curr.$like) == "string") {
                        curr.$like = new RegExp(curr.$like);
                    }
                }
            }
        }
    }
    /** Simple procedure for checking if given item
     *  matches the pattern.
     */
    PaternMatcher.prototype.isMatch = function (item) {
        for (var filter in this.pattern) {
            if (this.pattern.hasOwnProperty(filter)) {
                var curr = this.pattern[filter];
                if (Array.isArray(curr)) {
                    var match = false;
                    for (var _i = 0, curr_1 = curr; _i < curr_1.length; _i++) {
                        var filter1 = curr_1[_i];
                        if (item[filter] === filter1) {
                            match = true;
                            break;
                        }
                    }
                    if (!match) {
                        return false;
                    }
                }
                else if (typeof (curr) == "object") {
                    if (curr.$like) {
                        if (Array.isArray(curr.$like)) {
                            var match = false;
                            for (var _a = 0, _b = curr.$like; _a < _b.length; _a++) {
                                var filter1 = _b[_a];
                                if (filter1.test(item[filter])) {
                                    match = true;
                                    break;
                                }
                            }
                            if (!match) {
                                return false;
                            }
                        }
                        else if (!curr.$like.test(item[filter])) {
                            return false;
                        }
                    }
                    else {
                        return false;
                    }
                }
                else {
                    if (item[filter] !== this.pattern[filter]) {
                        return false;
                    }
                }
            }
        }
        return true;
    };
    return PaternMatcher;
}());
exports.PaternMatcher = PaternMatcher;
