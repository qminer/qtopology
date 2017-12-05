let type = "json"
if (process.argv.length > 2) {
    type = process.argv[2];
}

let content = [];

if (type == "json") {
    content.push([50, JSON.stringify({ a: 2, b: true })]);
    content.push([130, JSON.stringify({ a: 1, b: false })]);
    content.push([2500, JSON.stringify({ a: 3, b: true })]);
    content.push([2550, JSON.stringify({ a: 8, b: false })]);
    content.push([4550, JSON.stringify({ a: 4, b: true })]);
    content.push([4650, JSON.stringify({ a: 55, b: true })]);
} else if (type == "csv") {
    content.push([70, "1,2,3"]);
    content.push([80, "1,2,5"]);
    content.push([3500, "g,h,j"]);
    content.push([3550, "pok,iuh,ug"]);
    content.push([5550, "žćč žćčžćč,ž,ć"]);
    content.push([5650, "00,rewer,true"]);
} else {
    content.push([50, "jjji"]);
    content.push([130, "a b c d"]);
    content.push([1500, "098 098 09876 5"]);
    content.push([1550, "----------- - ----- ---- - -- "]);
    content.push([3550, "*******"]);
    content.push([3650, "tzu uzuztuz uizghbvbn klčnkj njk hhgk"]);

    for (let i = 0; i < 20; i++) {
        content.push([4500 + i, "content " + i]);
    }
}

content.forEach(x => {
    setTimeout(() => { console.log(x[1]); }, x[0]);
});

