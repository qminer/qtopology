function QTopologyDashboardViewModel(divIdTarget) {
    this.target_div = divIdTarget;

    this.workers = ko.observableArray();
    this.topologies = ko.observableArray();
    this.storage_props = ko.observableArray();
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
            self.workers.push(d);
        }
    });
    self.post("topology-status", {}, function (data) {
        self.topologies.removeAll();
        for (let d of data) {
            self.topologies.push(d);
        }
    });
    // self.post("worker-status", {}, function(err, data) {

    // });
    if (callback) {
        callback();
    }
}
