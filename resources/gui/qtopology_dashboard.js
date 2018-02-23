function QTopologyDashboardViewModel(divIdTarget) {
    this.target_div = divIdTarget;
    this.show_content = ko.observable(false);

    this.workers = ko.observableArray();
    this.workers_alive = ko.observableArray();
    this.workers_not_alive = ko.observableArray();
    this.workers_not_alive_expanded = ko.observable(true);
    this.topologies = ko.observableArray();
    this.topologies_enabled = ko.observableArray();
    this.topologies_not_enabled = ko.observableArray();
    this.topologies_not_enabled_expanded = ko.observable(true);
    this.storage_props = ko.observableArray();
    this.show_custom_props = ko.observable(false);
    this.custom_props = ko.observableArray();
    this.msg_queue_current = ko.observableArray();
    this.msg_queue_history = ko.observableArray();
    this.active_blade = null;

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

    this.showError = ko.observable(false);
    this.errorMessage = ko.observable("");

    this.blades = [this.bladeWorker, this.bladeTopology];
    this.prepareBlades();
}
QTopologyDashboardViewModel.prototype.closeError = function () {
    this.showError(false);
}
QTopologyDashboardViewModel.prototype.formatDateGui = function (d) {
    var dd = new Date(d.getTime());
    dd.setMinutes(dd.getMinutes() - dd.getTimezoneOffset());
    return dd.toISOString()
        .replace("T", " ")
        .substr(0, 19);
}
QTopologyDashboardViewModel.prototype.post = function (cmd, data, callback) {
    var self = this;
    self.showError(false);
    self.errorMessage("");
    $.ajax({
        url: cmd,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(data),
        success: callback,
        error: function (xhr, status, e) {
            self.showError(true);
            self.errorMessage("[" + cmd + "]:" + xhr.responseText);
        }
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
        for (var prop of props.storage) {
            self.storage_props.push(prop);
        }
        props.custom = props.custom || [];
        self.custom_props.removeAll();
        self.show_custom_props(props.custom.length > 0);
        for (var prop of props.custom) {
            self.custom_props.push(prop);
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
            hit.pid(d.pid || "-");
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
        if (x.enabled() || x.status() == "paused" || x.status() == "running" || x.status() == "waiting") {
            self.topologies_enabled.push(x);
        } else {
            self.topologies_not_enabled.push(x);
            x.worker("-");
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
    this.show_content(true);
    this.loadDisplayData();
    this.loadData(callback);
    this.periodicRefresh();
}
QTopologyDashboardViewModel.prototype.periodicRefresh = function () {
    var self = this;
    setInterval(function () {
        self.loadData(function () { });
    }, 15 * 1000);
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
    this.active_blade = name;
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
    topology.viz_html = ko.observable();
    self.selected_topology(topology);
    self.showBlade(self.bladeTopology);
    self.post("topology-info", { uuid: uuid }, function (data) {
        topology.config(data.config);
        // draw topology
        //$('.panel-viz').html(drawGraph(data.config));
        var conf = data.config;//JSON.parse(data.config);
        var svg_img = drawGraph(conf);
        svg_img = btoa(svg_img);
        topology.viz_html("data:image/svg+xml;base64," + svg_img);
        //topology.viz_html("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNi4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iMTI2cHgiIGhlaWdodD0iMTI2cHgiIHZpZXdCb3g9IjAgMCAxMjYgMTI2IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAxMjYgMTI2IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxyZWN0IHg9IjEuMDk1IiB5PSI5OC4yMjQiIHdpZHRoPSIxMjMuODEiIGhlaWdodD0iMTkuMjc1Ii8+DQoJPHJlY3QgeD0iMS4wOTUiIHk9Ijg1Ljc0IiB3aWR0aD0iMTIzLjgxIiBoZWlnaHQ9IjUuMjA1Ii8+DQoJPHBhdGggZD0iTTE4LjQwNCw5NS43MjFjMC43NjcsMCwxLjM4OS0wLjYyMywxLjM4OS0xLjM5cy0wLjYyMi0xLjM4OC0xLjM4OS0xLjM4OEgzLjQ4MWMtMC43NjcsMC0xLjM4OCwwLjYyMS0xLjM4OCwxLjM4OA0KCQlzMC42MjIsMS4zOSwxLjM4OCwxLjM5SDE4LjQwNHoiLz4NCgk8cGF0aCBkPSJNNDQuNDMzLDk1LjcyMWMwLjc2NywwLDEuMzg4LTAuNjIzLDEuMzg4LTEuMzlzLTAuNjIyLTEuMzg4LTEuMzg4LTEuMzg4SDI5LjUxYy0wLjc2NywwLTEuMzg5LDAuNjIxLTEuMzg5LDEuMzg4DQoJCXMwLjYyMiwxLjM5LDEuMzg5LDEuMzlINDQuNDMzeiIvPg0KCTxwYXRoIGQ9Ik03MC40NjEsOTUuNzIxYzAuNzY3LDAsMS4zODgtMC42MjMsMS4zODgtMS4zOXMtMC42MjItMS4zODgtMS4zODgtMS4zODhINTUuNTM5Yy0wLjc2NywwLTEuMzg4LDAuNjIxLTEuMzg4LDEuMzg4DQoJCXMwLjYyMiwxLjM5LDEuMzg4LDEuMzlINzAuNDYxeiIvPg0KCTxwYXRoIGQ9Ik05Ni40OSw5NS43MjFjMC43NjcsMCwxLjM4OS0wLjYyMywxLjM4OS0xLjM5cy0wLjYyMi0xLjM4OC0xLjM4OS0xLjM4OEg4MS41NjdjLTAuNzY3LDAtMS4zODgsMC42MjEtMS4zODgsMS4zODgNCgkJczAuNjIyLDEuMzksMS4zODgsMS4zOUg5Ni40OXoiLz4NCgk8cGF0aCBkPSJNMTIyLjUxOSw5NS43MjFjMC43NjcsMCwxLjM4OS0wLjYyMywxLjM4OS0xLjM5cy0wLjYyMi0xLjM4OC0xLjM4OS0xLjM4OGgtMTQuOTIzYy0wLjc2NywwLTEuMzg4LDAuNjIxLTEuMzg4LDEuMzg4DQoJCXMwLjYyMiwxLjM5LDEuMzg4LDEuMzlIMTIyLjUxOXoiLz4NCgk8cGF0aCBkPSJNNy40MSw4MC45aDUzLjQ0MmMwLjg2MywwLDEuNTYyLTAuNjk5LDEuNTYyLTEuNTYyVjM5LjU0M2MwLTAuODYyLTAuNjk5LTEuNTYzLTEuNTYyLTEuNTYzSDQ1LjMxNHYtNi41MzkNCgkJYzAtMC44NjEtMC42OTgtMS41NjItMS41NjEtMS41NjJIMjMuNDI4Yy0wLjg2MywwLTEuNTYyLDAuNy0xLjU2MiwxLjU2MnY2LjU0SDcuNDFjLTAuODYyLDAtMS41NjIsMC43LTEuNTYyLDEuNTYzdjM5Ljc5NQ0KCQlDNS44NDgsODAuMjAxLDYuNTQ3LDgwLjksNy40MSw4MC45eiBNMzQuNDkyLDU3Ljg3NGgtMS43OTZ2LTYuNzY4aDEuNzk2VjU3Ljg3NHogTTI2LjU2MywzNC41NzRoMTQuMDU1djMuNDA2SDI2LjU2M1YzNC41NzR6DQoJCSBNMTAuNTQ0LDQyLjY3OGg0Ny4xNzN2MTEuOThIMzYuOTQydi00LjAwNmMwLTAuODYzLTAuNjk5LTEuNTYzLTEuNTYyLTEuNTYzaC0zLjU4MmMtMC44NjMsMC0xLjU2MiwwLjY5OS0xLjU2MiwxLjU2M3Y0LjAwNg0KCQlIMTAuNTQ0VjQyLjY3OHoiLz4NCgk8cGF0aCBkPSJNNjguNzM0LDgwLjloNDkuOTU4YzAuODA3LDAsMS40Ni0wLjY1MywxLjQ2LTEuNDZWMTcuNTM0YzAtMC44MDYtMC42NTMtMS40NTktMS40Ni0xLjQ1OWgtMTQuNTI0VjkuOTYxDQoJCWMwLTAuODA3LTAuNjUzLTEuNDYtMS40Ni0xLjQ2aC0xOWMtMC44MDcsMC0xLjQ2LDAuNjUzLTEuNDYsMS40NnY2LjExNUg2OC43MzRjLTAuODA3LDAtMS40NiwwLjY1My0xLjQ2LDEuNDU5Vjc5LjQ0DQoJCUM2Ny4yNzQsODAuMjQ3LDY3LjkyNyw4MC45LDY4LjczNCw4MC45eiBNODYuNjM4LDEyLjg5aDEzLjEzOXYzLjE4Nkg4Ni42MzhWMTIuODl6Ii8+DQo8L2c+DQo8L3N2Zz4NCg==");
    });
    self.post("topology-history", { uuid: uuid }, function (data) {
        topology.history.removeAll();
        data.forEach(function (x) {
            var d = new Date(x.ts);
            x.ts_d = d;
            x.pid = x.pid || "-";
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

function drawGraph(config) {
    config.bolts = config.bolts || [];
    config.spouts = config.spouts || [];
    var cmds = [];
    for (var spout of config.spouts) {
        cmds.push(spout.name + " [shape=rectangle];")
    }
    for (var bolt of config.bolts) {
        cmds.push(bolt.name + " [shape=ellipse];")
        bolt.inputs = bolt.inputs || [];
        for (var parent of bolt.inputs) {
            cmds.push(parent.source + "->" + bolt.name + ";");
        }
    }
    var dot_definition = "digraph { rankdir=\"LR\"; " + cmds.join("") + " }";
    if (cmds.length == 0) return '<?xml version="1.0" encoding="iso-8859-1"?><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g></g></svg>';
    var result = Viz(dot_definition, { format: "svg", engine: "dot", scale: 1 });

    var result_txt = Viz(dot_definition, { format: "plain", engine: "dot", scale: 1 });
    var logical_width = +result_txt.split("\n")[0].split(" ")[2];

    result = result
        .replace(/width=\"(\d)*(\w)*\"/gi, "width=\"" + (logical_width * 100) + "px\"")
        .replace(/height=\"(\d)*(\w)*\"/gi, "");
    return result;
}

QTopologyDashboardViewModel.prototype.closeBlade = function () {
    $(".blade").hide();
    this.active_blade = null;
}

QTopologyDashboardViewModel.prototype.prepareBlades = function () {
    var self = this;
    $(".close-btn").click(function () {
        self.closeBlade();
    });
    $(".blade").hide();
    $(document).keyup(function (e) {
        if (e.keyCode === 27) {
            if (self.showError()) {
                self.showError(false);
            } else {
                self.closeBlade();
            }
        }
    });
}

QTopologyDashboardViewModel.prototype.setTopologyEnabled = function (uuid) {
    var self = this;
    self.post("enable-topology", { uuid: uuid }, function () {
        self.loadData(function () {
            if (self.active_blade == this.bladeTopology) {
                self.showTopologyInfo(uuid);
            }
        });
    });
}
QTopologyDashboardViewModel.prototype.setTopologyDisabled = function (uuid) {
    var self = this;
    self.post("disable-topology", { uuid: uuid }, function () {
        self.loadData(function () {
            if (self.active_blade == this.bladeTopology) {
                self.showTopologyInfo(uuid);
            }
        });
    });
}
QTopologyDashboardViewModel.prototype.clearTopologyError = function (uuid) {
    var self = this;
    self.post("clear-topology-error", { uuid: uuid }, function () {
        self.loadData(function () {
            if (self.active_blade == this.bladeTopology) {
                self.showTopologyInfo(uuid);
            }
        });
    });
}
QTopologyDashboardViewModel.prototype.stopTopology = function (uuid) {
    var self = this;
    self.post("stop-topology", { uuid: uuid }, function () {
        self.loadData(function () {
            if (self.active_blade == this.bladeTopology) {
                self.showTopologyInfo(uuid);
            }
        });
    });
}
QTopologyDashboardViewModel.prototype.killTopology = function (uuid) {
    var self = this;
    self.post("kill-topology", { uuid: uuid }, function () {
        self.loadData(function () {
            if (self.active_blade == this.bladeTopology) {
                self.showTopologyInfo(uuid);
            }
        });
    });
}
QTopologyDashboardViewModel.prototype.deleteWorker = function (name) {
    var self = this;
    self.post("delete-worker", { name: name }, function () {
        self.loadData(function () {
            self.closeBlade();
        });
    });
}
QTopologyDashboardViewModel.prototype.shutDownWorker = function (name) {
    var self = this;
    self.post("shut-down-worker", { name: name }, function () {
        self.loadData(function () {
            if (self.active_blade == this.bladeWorker) {
                self.showWorkerInfo(name);
            }
        });
    });
}
QTopologyDashboardViewModel.prototype.disableWorker = function (name) {
    var self = this;
    self.post("disable-worker", { name: name }, function () {
        self.loadData(function () {
            if (self.active_blade == this.bladeWorker) {
                self.showWorkerInfo(name);
            }
        });
    });
}
QTopologyDashboardViewModel.prototype.enableWorker = function (name) {
    var self = this;
    self.post("enable-worker", { name: name }, function () {
        self.loadData(function () {
            if (self.active_blade == this.bladeWorker) {
                self.showWorkerInfo(name);
            }
        });
    });
}
QTopologyDashboardViewModel.prototype.rebalanceLeader = function (name) {
    var self = this;
    self.post("rebalance-leader", { name: name }, function () {
        self.loadData(function () {
            if (self.active_blade == this.bladeWorker) {
                self.showWorkerInfo(name);
            }
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
    this.enable = function () { self.parent.enableWorker(self.name()); };
    this.disable = function () { self.parent.disableWorker(self.name()); };
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
    this.pid = ko.observable(d.pid || "-");
    this.config = ko.observable("");
    this.error = ko.observable(d.error || "-");
    this.worker = ko.observable(d.worker || "-");
    this.history = ko.observableArray();
    this.open = function () { self.parent.showTopologyInfo(self.uuid()); };
    this.set_enabled = function () { self.parent.setTopologyEnabled(self.uuid()); };
    this.set_disabled = function () { self.parent.setTopologyDisabled(self.uuid()); };
    this.clear_error = function () { self.parent.clearTopologyError(self.uuid()); };
    this.stop = function () { self.parent.stopTopology(self.uuid()); };
    this.kill = function () { self.parent.killTopology(self.uuid()); };
}
