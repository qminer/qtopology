const plantuml = require("node-plantuml");
const fs = require("fs");
const async = require("async");

function processFile(fname, cb) {
    console.log("Processing file", fname);
    const gen = plantuml.generate(fname, { format: "svg" });
    const stream = gen.out.pipe(fs.createWriteStream(fname + ".svg"));
    stream.on("finish", () => {
        console.log("Finished file", fname);
        cb();
    });
}

const files = fs.readdirSync(".").filter(x => x.endsWith(".uml"));
async.eachSeries(files,
    (fname, cb) => {
        processFile(fname, cb);
    }
)
