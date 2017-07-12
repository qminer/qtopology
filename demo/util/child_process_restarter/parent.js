const qtopology = require("../../..");

let options = {
    cmd : "node",
    args: ["child.js"],
    args_restart: ["child.js", "-restart"],
    use_fork: false,
    stop_score: 5
};

let obj = new qtopology.ChildProcRestarter(options);
obj.start();

setTimeout(() => {
    console.log("Parent will stop the child");
    obj.stop();
    setTimeout(() => {
        console.log("Parent will start the child");
        obj.start();
        setTimeout(() => {
            console.log("Parent will stop the child - 2");
            obj.stop(() => {
                console.log("Parent stopped the child - 3");
            });
        }, 300);
    }, 5000);
}, 17000);
