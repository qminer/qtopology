function QTopologyDashboardViewModel(divIdTarget) {
    this.target_div = divIdTarget;

    this.workers = ko.observableArray();
    this.workers_alive = ko.observableArray();
    this.workers_not_alive = ko.observableArray();
    this.workers_not_alive_expanded = ko.observable(true);
    this.topologies = ko.observableArray();
    this.topologies_enabled = ko.observableArray();
    this.topologies_not_enabled = ko.observableArray();
    this.topologies_not_enabled_expanded = ko.observable(true);
    this.storage_props = ko.observableArray();
    this.msg_queue_current = ko.observableArray();
    this.msg_queue_history = ko.observableArray();

    var self = this;
    self.toggle_workers_not_alive = function (item) {
        self.workers_not_alive_expanded(!self.workers_not_alive_expanded());
    };
    self.toggle_topologies_not_enabled = function (item) {
        self.topologies_not_enabled_expanded(!self.topologies_not_enabled_expanded());
    };

    // blade worker
    this.selected_worker = ko.observable();
    // blade topology
    this.selected_topology = ko.observable();

    this.title = ko.observable("QTopology dashboard");
    this.show_back_link = ko.observable(false);
    this.back_url = ko.observable("#");
    this.back_title = ko.observable("Back");

    this.bladeMsgQueue = "bladeMsgQueue";
    this.bladeWorker = "bladeWorker";
    this.bladeTopology = "bladeTopology";

    this.blades = [this.bladeWorker, this.bladeTopology];
    this.prepareBlades();
}
QTopologyDashboardViewModel.prototype.formatDateGui = function (d) {
    var dd = new Date(d.getTime());
    dd.setMinutes(dd.getMinutes() - dd.getTimezoneOffset());
    return dd.toISOString()
        .replace("T", " ")
        .substr(0, 19);
}
QTopologyDashboardViewModel.prototype.post = function (cmd, data, callback) {
    $.ajax({
        url: cmd,
        type: "POST",
        contentType: "application/json; charset=utf-8",
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
            obj = new QTopologyDashboardViewModelTopology(d, self);
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
    this.topologies.sort(function (a, b) {
        return a.uuid().localeCompare(b.uuid());
    });
    self.topologies_enabled.removeAll();
    self.topologies_not_enabled.removeAll();
    self.topologies().forEach(function (x) {
        if (x.enabled()) {
            self.topologies_enabled.push(x);
        } else {
            self.topologies_not_enabled.push(x);
        }
    });

}
QTopologyDashboardViewModel.prototype.mergeWorkers = function (new_data) {
    var self = this;
    var existing_workers = self.workers.removeAll();
    for (var d of new_data) {
        var hits = existing_workers.filter(x => x.name() == d.name);
        var obj = null;
        if (hits.length == 0) {
            obj = new QTopologyDashboardViewModelWorker(d, self);
        } else {
            var hit = hits[0];
            hit.last_ping(new Date(d.last_ping));
            hit.status(d.status);
            hit.lstatus(d.lstatus);
            hit.lstatus_ts(new Date(d.lstatus_ts));
            obj = hit;
        }
        // match with topologies
        obj.topologies.removeAll();
        self.topologies().forEach(function (x) {
            if (x.worker() == d.name) {
                obj.topologies.push(x);
            }
        });
        obj.topologies_count(obj.topologies().length);
        self.workers.push(obj);
    }
    self.workers.sort(function (a, b) {
        return a.name().localeCompare(b.name());
    });
    self.workers_alive.removeAll();
    self.workers_not_alive.removeAll();
    self.workers().forEach(function (x) {
        if (x.status() == "alive") {
            self.workers_alive.push(x);
        } else {
            self.workers_not_alive.push(x);
        }
    });
}
QTopologyDashboardViewModel.prototype.init = function (callback) {
    this.loadDisplayData();
    this.loadData(callback);
    this.periodicRefresh();
}
QTopologyDashboardViewModel.prototype.periodicRefresh = function () {
    var self = this;
    setInterval(function () {
        self.loadData(function () { });
    }, 15000);
}
QTopologyDashboardViewModel.prototype.loadDisplayData = function () {
    var self = this;
    self.post("display-data", { name: name }, function (data) {
        self.show_back_link(data.back_url != null);
        self.back_url(data.back_url);
        self.back_title(data.back_title);
        if (data.title) {
            self.title(data.title);
        }
    });
}
QTopologyDashboardViewModel.prototype.showBlade = function (name) {
    for (var blade_name of this.blades) {
        $("#" + blade_name).hide();
    }
    $("#" + name).show();
}
QTopologyDashboardViewModel.prototype.showMsgQueue = function () {
    var self = this;
    this.msg_queue_current.removeAll();
    this.msg_queue_history.removeAll();
    this.showBlade(this.bladeMsgQueue);
    self.post("msg-queue-content", {}, function (res) {

        res.data.forEach(function (x) {
            var d1 = new Date(x.ts);
            x.ts_d = d1;
            x.ts_s = self.formatDateGui(d1);
            var d2 = new Date(x.valid_until);
            x.valid_until_d = d2;
            x.valid_until_s = self.formatDateGui(d2);
            x.content_s = JSON.stringify(x.content);

            self.msg_queue_current.push(x);
        });

    });
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
            x.expanded = ko.observable(false);
            x.click = function () { x.expanded(!x.expanded()); };
            topology.history.push(x);
        });
        // sort descending in time
        topology.history.sort(function (a, b) {
            return (a.ts_d < b.ts_d ? 1 : (a.ts_d > b.ts_d ? -1 : 0));
        });
    });
}

QTopologyDashboardViewModel.prototype.closeBlade = function () {
    $(".blade").hide();
}

QTopologyDashboardViewModel.prototype.prepareBlades = function () {
    var self = this;
    // wire-up close buttons
    //$(".blade-close").click(function () {
    $(".close-btn").click(function () {
        self.closeBlade();
    });
    $(".blade").hide();
    $(document).keyup(function (e) {
        if (e.keyCode === 27) {
            self.closeBlade();
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
QTopologyDashboardViewModel.prototype.rebalanceLeader = function (name) {
    var self = this;
    self.post("rebalance-leader", { name: name }, function () {
        self.loadData(function () {
            self.showWorkerInfo(name);
        });
    });
}


function QTopologyDashboardViewModelWorker(d, parent) {
    var self = this;
    this.parent = parent;
    this.name = ko.observable(d.name);
    this.last_ping = ko.observable(new Date(d.last_ping));
    this.status = ko.observable(d.status);
    this.lstatus = ko.observable(d.lstatus);
    this.lstatus_ts = ko.observable(new Date(d.lstatus_ts));
    this.topologies_count = ko.observable(0);
    this.topologies = ko.observableArray();
    this.history = ko.observableArray();
    this.open = function () { self.parent.showWorkerInfo(self.name()); };
    this.shut_down = function () { self.parent.shutDownWorker(self.name()); };
    this.rebalance = function () { self.parent.rebalanceLeader(self.name()); };
    this.remove = function () { self.parent.deleteWorker(self.name()); };
    this.last_ping_s = ko.computed(function () {
        return self.parent.formatDateGui(self.last_ping());
    });
}

function QTopologyDashboardViewModelTopology(d, parent) {
    var self = this;
    this.parent = parent;
    this.uuid = ko.observable(d.uuid);
    this.enabled = ko.observable(d.enabled);
    this.status = ko.observable(d.status);
    this.config = ko.observable("");
    this.error = ko.observable(d.error || "-");
    this.worker = ko.observable(d.worker || "-");
    this.history = ko.observableArray();
    this.open = function () { self.parent.showTopologyInfo(self.uuid()); };
    this.set_enabled = function () { self.parent.setTopologyEnabled(self.uuid()); };
    this.set_disabled = function () { self.parent.setTopologyDisabled(self.uuid()); };
    this.clear_error = function () { self.parent.clearTopologyError(self.uuid()); };
    this.stop = function () { self.parent.stopTopology(self.uuid()); };
}
