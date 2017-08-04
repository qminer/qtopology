function QTopologyDashboardViewModel(divIdTarget) {
    this.target_div = divIdTarget;

    this.workers = ko.observableArray();
    this.topologies = ko.observableArray();
    this.storage_props = ko.observableArray();

    // blade worker
    this.selected_worker = ko.observable();
    // blade topology
    this.selected_topology = ko.observable();

    this.bladeWorker = "bladeWorker";
    this.bladeTopology = "bladeTopology";

    this.blades = [this.bladeWorker, this.bladeTopology];
    this.prepareBlades();
}
QTopologyDashboardViewModel.prototype.formatDateGui = function (d) {
    let dd = new Date(d.getTime());
    dd.setMinutes(dd.getMinutes() - dd.getTimezoneOffset());
    return dd.toISOString()
        .replace("T", " ")
        .substr(0,19);
}
QTopologyDashboardViewModel.prototype.post = function (cmd, data, callback) {
    $.ajax({
        url: "/" + cmd,
        type: "POST",
        dataType: "json",
        data: JSON.stringify(data),
        success: callback
    });
}
QTopologyDashboardViewModel.prototype.loadData = function (callback) {
    var self = this;
    self.post("topology-status", {}, function (data_topologies) {
        self.mergeTopologies(data_topologies);
        self.post("worker-status", {}, function (data_workers) {
            self.mergeWorkers(data_workers);
            if (callback) {
                callback();
            }
        });
    });
    self.post("storage-info", {}, function (props) {
        // here, it is OK to just overwrite stuff
        self.storage_props.removeAll();
        for (var prop of props.data) {
            self.storage_props.push(prop);
        }
    });
}
QTopologyDashboardViewModel.prototype.mergeTopologies = function (new_data) {
    var self = this;
    var existing_topologies = this.topologies.removeAll();
    for (var d of new_data) {
        var hits = existing_topologies.filter(x => x.uuid() == d.uuid);
        var obj = null;
        if (hits.length == 0) {
            var uuid = d.uuid;
            var rec = {
                uuid: ko.observable(uuid),
                enabled: ko.observable(d.enabled),
                status: ko.observable(d.status),
                config: ko.observable(""),
                error: ko.observable(d.error || "-"),
                worker: ko.observable(d.worker || "-"),
                history: ko.observableArray(),
                open: function () { self.showTopologyInfo(uuid); },
                set_enabled: function () { self.setTopologyEnabled(uuid); },
                set_disabled: function () { self.setTopologyDisabled(uuid); },
                clear_error: function () { self.clearTopologyError(uuid); },
                stop: function () { self.stopTopology(uuid); }
            };
            obj = rec;
        } else {
            var hit = hits[0];
            hit.enabled(d.enabled);
            hit.status(d.status || "-");
            hit.error(d.error || "-");
            hit.worker(d.worker || "-");
            obj = hit;
        }
        this.topologies.push(obj);
    }
}
QTopologyDashboardViewModel.prototype.mergeWorkers = function (new_data) {
    var self = this;
    var existing_workers = self.workers.removeAll();
    for (var d of new_data) {
        var hits = existing_workers.filter(x => x.name() == d.name);
        var obj = null;
        var name = d.name;
        if (hits.length == 0) {
            var rec = {
                name: ko.observable(name),
                last_ping: ko.observable(new Date(d.last_ping)),
                status: ko.observable(d.status),
                lstatus: ko.observable(d.lstatus || "-"),
                lstatus_ts: ko.observable(new Date(d.lstatus_ts)),
                topologies_count: ko.observable(0),
                topologies: ko.observableArray(),
                history: ko.observableArray(),
                open: function () { self.showWorkerInfo(name); },
                shut_down: function () { self.shutDownWorker(name); },
                remove: function () { self.deleteWorker(name); }
            };
            rec.last_ping_s = ko.computed(function () {
                return self.formatDateGui(rec.last_ping());
            });
            obj = rec;
        } else {
            var hit = hits[0];
            hit.last_ping(new Date(d.last_ping));
            hit.status(d.status);
            hit.lstatus(d.lstatus || "-");
            hit.lstatus_ts(new Date(d.lstatus_ts));
            obj = hit;
        }
        // match with topologies
        obj.topologies.removeAll();
        self.topologies().forEach(function (x) {
            if (x.worker() == name) {
                obj.topologies.push(x);
            }
        });
        obj.topologies_count(obj.topologies().length);
        self.workers.push(obj);
    }
}
QTopologyDashboardViewModel.prototype.init = function (callback) {
    this.loadData(callback);
}
QTopologyDashboardViewModel.prototype.showBlade = function (name) {
    for (var blade_name of this.blades) {
        $("#" + blade_name).hide();
    }
    $("#" + name).show();
}
QTopologyDashboardViewModel.prototype.showWorkerInfo = function (name) {
    var self = this;
    var worker = this.workers().filter(function (x) { return x.name() == name; })[0];
    this.selected_worker(worker);
    this.showBlade(this.bladeWorker);
    self.post("worker-history", { name: name }, function (data) {
        worker.history.removeAll();
        data.forEach(function (x) {
            var d = new Date(x.ts);
            x.ts_d = d;
            x.ts_s = self.formatDateGui(d);
            worker.history.push(x);
        });
        // sort descending in time
        worker.history.sort(function (a, b) {
            return (a.ts_d < b.ts_d ? 1 : (a.ts_d > b.ts_d ? -1 : 0));
        });
    });
}
QTopologyDashboardViewModel.prototype.showTopologyInfo = function (uuid) {
    var self = this;
    var topology = self.topologies().filter(function (x) { return x.uuid() == uuid; })[0];
    self.selected_topology(topology);
    self.showBlade(self.bladeTopology);
    self.post("topology-info", { uuid: uuid }, function (data) {
        topology.config(data.config);
    });
    self.post("topology-history", { uuid: uuid }, function (data) {
        topology.history.removeAll();
        data.forEach(function (x) {
            var d = new Date(x.ts);
            x.ts_d = d;
            x.ts_s = self.formatDateGui(d);
            topology.history.push(x);
        });
        // sort descending in time
        topology.history.sort(function (a, b) {
            return (a.ts_d < b.ts_d ? 1 : (a.ts_d > b.ts_d ? -1 : 0));
        });
    });
}

QTopologyDashboardViewModel.prototype.prepareBlades = function () {
    var self = this;
    for (var ii = 0; ii < self.blades.length; ii++) (function (i) {
        var blade_name = self.blades[i];
        var blade_obj = $("#" + blade_name);
        blade_obj.hide();
        // prepend close buttons
        blade_obj.find(".blade-close").click(function () {
            blade_obj.hide();
        })
    })(ii);
    $(document).keyup(function (e) {
        if (e.keyCode === 27) {
            $(".blade").hide();
        }
    });
}

QTopologyDashboardViewModel.prototype.setTopologyEnabled = function (uuid) {
    var self = this;
    self.post("enable-topology", { uuid: uuid }, function () {
        self.loadData(function () {
            self.showTopologyInfo(uuid);
        });
    });
}
QTopologyDashboardViewModel.prototype.setTopologyDisabled = function (uuid) {
    var self = this;
    self.post("disable-topology", { uuid: uuid }, function () {
        self.loadData(function () {
            self.showTopologyInfo(uuid);
        });
    });
}
QTopologyDashboardViewModel.prototype.clearTopologyError = function (uuid) {
    var self = this;
    self.post("clear-topology-error", { uuid: uuid }, function () {
        self.loadData(function () {
            self.showTopologyInfo(uuid);
        });
    });
}
QTopologyDashboardViewModel.prototype.stopTopology = function (uuid) {
    var self = this;
    self.post("stop-topology", { uuid: uuid }, function () {
        self.loadData(function () {
            self.showTopologyInfo(uuid);
        });
    });
}
QTopologyDashboardViewModel.prototype.deleteWorker = function (name) {
    var self = this;
    self.post("delete-worker", { name: name }, function () {
        self.loadData(function () {
            self.showWorkerInfo(name);
        });
    });
}
QTopologyDashboardViewModel.prototype.shutDownWorker = function (name) {
    var self = this;
    self.post("shut-down-worker", { name: name }, function () {
        self.loadData(function () {
            self.showWorkerInfo(name);
        });
    });
}
