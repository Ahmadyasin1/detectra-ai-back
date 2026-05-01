const fs = require('fs');
let txt = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
txt = txt.split(String.fromCharCode(92) + '`').join('`');
txt = txt.split(String.fromCharCode(92) + '$').join('$');
fs.writeFileSync('src/pages/Dashboard.tsx', txt, 'utf8');
