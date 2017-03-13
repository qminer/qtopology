class InprocHelper {
    constructor() {
        this._name = null;
        this._init = null;

        this._init_called = 0;
        this._heartbeat_called = 0;
    }

    init(name, init, callback) {
        this._init_called++;
        this._name = name;
        this._init = init;
        callback();
    }

    heartbeat(){
        this._heartbeat_called++;
    }
};

exports.create = function () {
    return new InprocHelper();
};
