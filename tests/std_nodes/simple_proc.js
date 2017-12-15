setTimeout(() => {
    console.error("bad error");
}, 50);
setTimeout(() => {
    console.log(JSON.stringify(
        { a: 5 }
    ));
    console.log("bad json");
}, 100)