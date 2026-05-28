const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      let changed = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('localStorage.getItem') && !line.includes('typeof window')) {
          lines[i] = line.replace(/localStorage\.getItem\((.*?)\)/, "typeof window !== 'undefined' ? localStorage.getItem($1) : null");
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, lines.join('\n'));
        console.log('Fixed ' + fullPath);
      }
    }
  }
}

processDir('src');
