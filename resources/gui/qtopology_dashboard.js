function QTopologyDashboardViewModel(divIdTarget) {
    this.target_div = divIdTarget;

    this.workers = ko.observableArray();
    this.topologies = ko.observableArray();
    this.storage_props = ko.observableArray();

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
    // $.post("/" + cmd, data)
    //     .done(function (res) { callback(null, res); })
    //     .error(function (err) { callback(err); });
}

QTopologyDashboardViewModel.prototype.init = function (callback) {
    let self = this;
    self.post("worker-status", {}, function (data) {
        self.workers.removeAll();
        for (let d of data) {
            d.open = function () { self.showWorkerInfo(d.name); };
            self.workers.push(d);
        }
    });
    self.post("topology-status", {}, function (data) {
        self.topologies.removeAll();
        for (let d of data) {
            d.open = function () { self.showTopologyInfo(d.uuid); };
            self.topologies.push(d);
        }
    });
    // self.post("worker-status", {}, function(err, data) {

    // });
    if (callback) {
        callback();
    }
}

QTopologyDashboardViewModel.prototype.showBlade = function (name) {
    //$("#" + name).toggle("slide", { direction: "right"}, 500);
    $("#" + name).show({ duration: 500, easing: "swing" });
}
QTopologyDashboardViewModel.prototype.showWorkerInfo = function (name) {
    //$("#" + this.bladeWorker).toggle("slide", { direction: "right"}, 500);
    this.showBlade(this.bladeWorker);
}
QTopologyDashboardViewModel.prototype.showTopologyInfo = function (uuid) {
    //$("#" + this.bladeTopology).toggle("slide", { direction: "right"}, 500);
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
        // var $input = $('<input id="btnClose' + blade_name + '" type="button" value="Close.." />');
        // blade_obj.prepend(blade_obj);
    })(ii);
}
