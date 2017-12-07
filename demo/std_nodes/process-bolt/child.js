///////////////////////////////////////////////////////////////
// Demo child process
///////////////////////////////////////////////////////////////

var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

let cntr = 0;

// emit count after each 3 messages
rl.on('line', (line) => {
    if (++cntr % 3 == 0) {
        console.log(JSON.stringify({ counter: cntr }));
    }
})
