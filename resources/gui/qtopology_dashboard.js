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
    let self = this;

    // TODO make this smarter - it should just update existing object wherever possible

    self.post("topology-status", {}, function (data_topologies) {
        // let existing_topologies = self.topologies.removeAll();
        // for (let d of data_topologies) {
        //     d.worker = d.worker || "-";
        //     d.error = d.error || "-";
        //     d.open = function () { self.showTopologyInfo(d.uuid); };
        //     d.set_enabled = function () { self.setTopologyEnabled(d.uuid); };
        //     d.set_disabled = function () { self.setTopologyDisabled(d.uuid); };
        //     d.clear_error = function () { self.clearTopologyError(d.uuid); };

        //     self.topologies.push(d);
        // }
        self.mergeTopologies(data_topologies);
        self.post("worker-status", {}, function (data_workers) {
            // self.workers.removeAll();
            // for (let d of data_workers) {
            //     d.open = function () { self.showWorkerInfo(d.name); };
            //     d.topologies = ko.observableArray();
            //     d.lstatus = d.lstatus || "-";
            //     self.topologies().forEach(function (x) {
            //         if (x.worker() == d.name) {
            //             d.topologies.push(x);
            //         }
            //     });
            //     d.topologies_count = ko.observable(d.topologies().length);
            //     self.workers.push(d);
            // }
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
    let self = this;
    let existing_topologies = this.topologies.removeAll();
    for (let d of new_data) {
        let hits = existing_topologies.filter(x => x.uuid() == d.uuid);
        let obj = null;
        if (hits.length == 0) {
            let uuid = d.uuid;
            let rec = {
                uuid: ko.observable(uuid),
                enabled: ko.observable(d.enabled),
                last_ping: ko.observable(new Date(d.last_ping)),
                status: ko.observable(d.status),
                config: ko.observable(d.config),
                error: ko.observable(d.error || "-"),
                worker: ko.observable(d.worker || "-"),
                open: function () { self.showTopologyInfo(uuid); },
                set_enabled: function () { self.setTopologyEnabled(uuid); },
                set_disabled: function () { self.setTopologyDisabled(uuid); },
                clear_error: function () { self.clearTopologyError(uuid); },
                stop: function () { self.stopTopology(uuid); }
            };
            obj = rec;
        } else {
            let hit = hits[0];
            hit.enabled(d.enabled);
            hit.last_ping(new Date(d.last_ping));
            hit.status(d.status || "-");
            hit.config(d.config);
            hit.error(d.error || "-");
            hit.worker(d.worker || "-");
            obj = hit;
        }
        this.topologies.push(obj);
    }
}
QTopologyDashboardViewModel.prototype.mergeWorkers = function (new_data) {
    let self = this;
    let existing_workers = self.workers.removeAll();
    for (let d of new_data) {
        let hits = existing_workers.filter(x => x.name() == d.name);
        let obj = null;
        let name = d.name;
        if (hits.length == 0) {
            let rec = {
                name: ko.observable(name),
                last_ping: ko.observable(new Date(d.last_ping)),
                status: ko.observable(d.status),
                lstatus: ko.observable(d.lstatus || "-"),
                lstatus_ts: ko.observable(new Date(d.lstatus_ts)),
                topologies_count: ko.observable(0),
                topologies: ko.observableArray(),
                open: function () { self.showWorkerInfo(name); },
                shut_down: function () { self.shutDownWorker(name); },
                remove: function () { self.deleteWorker(name); }
            };
            obj = rec;
        } else {
            let hit = hits[0];
            hit.last_ping(new Date(d.last_ping));
            hit.status(d.status);
            hit.lstatus(d.lstatus || "-");
            hit.lstatus_ts(new Date(d.lstatus_ts));
            obj = hit;
        }
        // match will topologies
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
    //$("#" + name).show({ duration: 200, easing: "swing" });
    $("#" + name).show();
}
QTopologyDashboardViewModel.prototype.showWorkerInfo = function (name) {
    var worker = this.workers().filter(function (x) { return x.name() == name; })[0];
    this.selected_worker(worker);
    this.showBlade(this.bladeWorker);
}
QTopologyDashboardViewModel.prototype.showTopologyInfo = function (uuid) {
    var topology = this.topologies().filter(function (x) { return x.uuid() == uuid; })[0];
    this.selected_topology(topology);
    this.showBlade(this.bladeTopology);
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
    let self = this;
    self.post("enable-topology", { uuid: uuid }, function () {
        self.loadData();
    });
}
QTopologyDashboardViewModel.prototype.setTopologyDisabled = function (uuid) {
    let self = this;
    self.post("disable-topology", { uuid: uuid }, function () {
        self.loadData();
    });
}
QTopologyDashboardViewModel.prototype.clearTopologyError = function (uuid) {
    let self = this;
    self.post("clear-topology-error", { uuid: uuid }, function () {
        self.loadData();
    });
}
QTopologyDashboardViewModel.prototype.stopTopology = function (uuid) {
    let self = this;
    self.post("stop-topology", { uuid: uuid }, function () {
        self.loadData();
    });
}
QTopologyDashboardViewModel.prototype.deleteWorker = function (name) {
    let self = this;
    self.post("delete-worker", { name: name }, function () {
        self.loadData();
    });
}
QTopologyDashboardViewModel.prototype.shutDownWorker = function (name) {
    let self = this;
    self.post("shut-down-worker", { name: name }, function () {
        self.loadData();
    });
}
