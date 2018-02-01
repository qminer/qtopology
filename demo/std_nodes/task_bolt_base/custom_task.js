const qt = require("../../..");

class CustomTaskBolt extends qt.TaskBoltBase {

    constructor() {
        super();
        this.custom_text = null;
    }

    init(name, config, context, callback) {
        let self = this;
        super.init(name, config, context, (err) => {
            if (err) return callback(err);
            self.custom_text = config.text;
            callback();
        })
    }

    runInternal(callback) {
        let self = this;
        console.log("Custom output from task bolt (1): " + self.custom_text);
        setTimeout(() => {
            console.log("Custom output from task bolt (2): " + self.custom_text);
            callback();
        }, 700);
    }
}

/////////////////////////////////////////////////////////
exports.create = function () {
    return new CustomTaskBolt();
};
