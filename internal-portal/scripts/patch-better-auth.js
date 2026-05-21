/**
 * Patch @better-auth/core package.json to fix broken workerd export condition.
 * The workerd condition points to ./dist/instrumentation/pure.index.mjs which
 * doesn't exist in the published package, causing esbuild to fail.
 * This script removes the broken workerd condition so the default export is used.
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'node_modules', '@better-auth', 'core', 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.log('[@better-auth/core] package not found, skipping patch.');
  process.exit(0);
}

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  if (pkg.exports) {
    let modified = false;
    
    // Recursively remove 'workerd' conditions from exports
    function cleanExports(obj) {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      if ('workerd' in obj) {
        delete obj.workerd;
        modified = true;
      }
      
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          cleanExports(obj[key]);
        }
      }
      
      return obj;
    }
    
    cleanExports(pkg.exports);
    
    if (modified) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log('[@better-auth/core] Patched: removed broken workerd export conditions.');
    } else {
      console.log('[@better-auth/core] No workerd conditions found, no patch needed.');
    }
  }
} catch (err) {
  console.error('[@better-auth/core] Failed to patch:', err.message);
  process.exit(1);
}
