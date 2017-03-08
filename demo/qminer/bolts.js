"use strict";

const qm = require("qminer");
const path = require("path");

///////////////////////////////////////////////////////////////////////////
// Constants

// default filename for aggregates
const aggr_file_name = "aggregates.bin";

// Schema for qminer store
const qm_schema = [
    {
        name: "values",
        fields: [
            { name: "target1", type: "float" },
            { name: "target2", type: "float" },
            { name: "ts", type: "datetime" }
        ]
    }
];

///////////////////////////////////////////////////////////////////////////

class QMinerBolt {

    constructor() {
        this._name = null;
        this._prefix = "";
        this._onEmit = null;

        this._db_dir = null;
        this._model_dir = null;
        this._cnt = 0;
        this._curr_ts = (new Date()).getTime() - 100000;
        this._target_field_name = null;
        // qm objects
        this._base = null;
        this._store = null;

        // aggregates
        this._aggr_win = null;
        this._aggr_win2 = null;
        this._aggr_ema = null;
        this._aggr_min = null;
        this._aggr_max = null;
    }

    init(name, config, callback) {
        this._name = name;
        this._prefix = `[QmBolt ${this._name}]`;
        //console.log(this._prefix, "Inside init:", config);

        this._target_field_name = (config.use_target2 ? "target2" : "target1");
        this._onEmit = config.onEmit;
        try {
            this._model_dir = path.resolve(config.model_dir || "./models");
            this._db_dir = path.resolve(config.db_dir || "./db");
            this._create_clean = config.create_clean;
            this._createStorage();
            let fname = path.join(this._model_dir, aggr_file_name);
            if (!this._create_clean && qm.fs.exists(fname)) {
                this._loadModels(fname);
            }

            callback(null, {});
        } catch (e) {
            console.log(e);
            callback(e);
        }
    }

    heartbeat() {
        let report = this._report();
        console.log(this._prefix, "Inside heartbeat. sum=" + JSON.stringify(report, null, "    "));
        this._onEmit(report);
    }

    shutdown(callback) {
        try {
            let report = this._report();
            console.log(this._prefix, "Before shutdown. sum=" + JSON.stringify(report, null, "    "));

            this._saveModels();
            this._store = null;
            this._base.close();
            this._base = null;
            qm.fs.rmdir(this._db_dir);
            callback(null, {});
        } catch (e) {
            console.log(e);
            callback(e);
        }
    }

    run() {
        console.log(this._prefix, "Inside run");
    }

    pause() {
        console.log(this._prefix, "Inside pause");
    }

    receive(data, callback) {
        this._cnt++;
        let rec = this._store.newRecord({
            ts: this._curr_ts,
            target1: data.a,
            target2: data.b
        });
        this._curr_ts += 500;
        this._aggr_win.onAdd(rec);
        this._aggr_win2.onAdd(rec);
        this._aggr_ema.onAdd(rec);
        this._aggr_min.onAdd(rec);
        this._aggr_max.onAdd(rec);

        callback(null, {});
    }

    /** Creates QMiner storage layer and aggregates */
    _createStorage() {
        this._base = new qm.Base({
            mode: "createClean",
            dbPath: this._db_dir,
            schema: qm_schema
        });
        this._store = this._base.store("values");

        this._aggr_win = new qm.StreamAggr(this._base, {
            name: "TimeSeriesAggr",
            type: "timeSeriesTick",
            store: "values",
            timestamp: "ts",
            value: this._target_field_name //"target1"
        });
        this._aggr_win2 = new qm.StreamAggr(this._base, {
            name: "TimeSeriesAggr2",
            type: "timeSeriesWinBufVector",
            inAggr: this._aggr_win.name,
            winsize: 5000
        });
        this._aggr_min = new qm.StreamAggr(this._base, {
            name: "MinAggr",
            type: "winBufMin",
            store: "values",
            inAggr: "TimeSeriesAggr2"
        });
        this._aggr_ema = new qm.StreamAggr(this._base, {
            name: "emaAggr",
            type: "ema",
            store: "values",
            inAggr: "TimeSeriesAggr",
            emaType: "previous",
            interval: 3000,
            initWindow: 2000
        });
        this._aggr_max = new qm.StreamAggr(this._base, {
            name: "MaxAggr",
            type: "winBufMax",
            store: "values",
            inAggr: "TimeSeriesAggr2"
        });
    }

    /** Store models to provided location */
    _backup(req, cb) {
        try {
            this._saveModels(req.msg.dir, req.msg.fname);
            cb();
        } catch (e) {
            cb(e);
        }
    }

    /** Restore models from provided location */
    _restore(req, cb) {
        try {
            this._loadModels(path.join(req.msg.dir, req.msg.fname));
            cb();
        } catch (e) {
            cb(e);
        }
    }

    /** Store models to file */
    _saveModels(dir, fname) {
        dir = dir || this._model_dir;
        fname = fname || aggr_file_name;

        qm.fs.mkdir(dir);
        let fout = new qm.fs.FOut(path.join(dir, fname));
        this._aggr_win.save(fout);
        this._aggr_win2.save(fout);
        this._aggr_ema.save(fout);
        this._aggr_min.save(fout);
        this._aggr_max.save(fout);
        fout.close();
    }

    /** Loads internal state (models) from given file */
    _loadModels(full_fname) {
        let fin = new qm.fs.FIn(full_fname);
        this._aggr_win.load(fin);
        this._aggr_win2.load(fin);
        this._aggr_ema.load(fin);
        this._aggr_min.load(fin);
        this._aggr_max.load(fin);
        fin.close();
    }

    /** Internal method for handling report requests */
    _report() {
        let res = {
            field: this._target_field_name,
            cnt: this._cnt,
            min: this._aggr_min.getFloat(),
            max: this._aggr_max.getFloat(),
            ema: this._aggr_ema.getFloat()
        }
        return res;
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.QMinerBolt = QMinerBolt;
