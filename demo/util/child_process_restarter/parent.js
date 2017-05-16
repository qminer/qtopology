const qtoplogy = require("../../..");
const cpr = qtoplogy.util.child_process_restarter;

let obj = new cpr.ChildProcRestarter("node", ["child.js"]);
obj.start();


setTimeout(() => {
    console.log("Parent will stop the child");
    obj.stop();
    setTimeout(() => {
        console.log("Parent will start the child");
        obj.start();
        setTimeout(() => {
            console.log("Parent will stop the child - 2");
            obj.stop();
        }, 300);
    }, 5000);
}, 17000);
