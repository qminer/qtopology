// simple child that does nothing for 10 seconds
console.log("Child process started");
setTimeout(function() {
    console.log("Child process shutting down");
}, 10000);
