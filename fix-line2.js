const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'backend', 'public', 'js', 'dashboard.js');
let s = fs.readFileSync(filePath, 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.indexOf('needLogin: true') !== -1 && line.indexOf('Please sign in again') !== -1 && line.indexOf('}) };') !== -1) {
    const end = "') };";
    const idx = line.indexOf(end);
    if (idx !== -1) {
      lines[i] = line.substring(0, idx + end.length);
      console.log('Truncated line', i + 1);
      break;
    }
    const idx2 = line.indexOf("');");
    if (idx2 !== -1) {
      const rest = line.substring(idx2);
      const semi = rest.indexOf("};");
      if (semi !== -1) {
        lines[i] = line.substring(0, idx2 + 3) + " };";
        console.log('Truncated line (alt)', i + 1);
        break;
      }
    }
  }
}
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Done.');
