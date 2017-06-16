const qtopology = require("../../..");

let obj = new qtopology.ChildProcRestarterFork("child.js", []);
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
