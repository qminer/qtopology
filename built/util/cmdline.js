"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OptionsDescription = (function () {
    function OptionsDescription() {
    }
    return OptionsDescription;
}());
var Singleton = (function () {
    function Singleton() {
        this.shortnames = {};
        this.names = {};
        this.descriptions = [];
    }
    Singleton.prototype.clear = function () {
        this.shortnames = {};
        this.names = {};
        this.descriptions = [];
    };
    Singleton.prototype.areFlags = function (letters) {
        for (var k = 0; k < letters.length; k++) {
            var letter = letters[k];
            if (!this.shortnames[letter] || !this.shortnames[letter].flag) {
                return false;
            }
        }
        return true;
    };
    Singleton.prototype.getValue = function (text) {
        if (!text) {
            return null;
        }
        for (var k = 0; k < text.length; k++) {
            if (text[k] < '0' || text[k] > '9') {
                return text;
            }
        }
        return parseInt(text);
    };
    Singleton.prototype.getTargetName = function (name, description) {
        if (!description) {
            return name;
        }
        if (description.target) {
            return description.target;
        }
        return description.name;
    };
    Singleton.prototype.define = function (shortname, name, defaultValue, text, options) {
        options = options || {};
        var description = {
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
    };
    Singleton.prototype.process = function (args) {
        var _this = this;
        var opts = {};
        this.descriptions.forEach(function (description) {
            if (description.default) {
                opts[_this.getTargetName(null, description)] = description.default;
            }
        });
        for (var k = 0; k < args.length; k++) {
            var arg = args[k];
            if (arg.length > 2 && arg[0] == '-' && arg[1] == '-') {
                var name_1 = arg.slice(2);
                var description = this.names[name_1];
                if (description && description.flag) {
                    opts[this.getTargetName(name_1, description)] = true;
                }
                else {
                    k++;
                    var val = this.getValue(args[k]);
                    opts[this.getTargetName(name_1, description)] = val;
                }
            }
            else if (arg.length > 1 && arg[0] == '-') {
                var shortname = arg.slice(1);
                var description = this.shortnames[shortname];
                if (!description && this.areFlags(shortname)) {
                    for (var k_1 = 0; k_1 < shortname.length; k_1++) {
                        var letter = this.shortnames[k_1];
                        description = this.shortnames[letter];
                        opts[this.getTargetName(letter, description)] = true;
                    }
                    continue;
                }
                if (description && description.flag) {
                    opts[this.getTargetName(shortname, description)] = true;
                }
                else {
                    k++;
                    var val = this.getValue(args[k]);
                    opts[this.getTargetName(shortname, description)] = val;
                }
            }
        }
        return opts;
    };
    return Singleton;
}());
exports.default = new Singleton();
