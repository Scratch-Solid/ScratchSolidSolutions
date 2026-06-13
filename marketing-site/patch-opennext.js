const fs = require('fs');
const path = require('path');

// Patch OpenNext AWS createServerBundle to externalize pg and pg-cloudflare
const file = path.join(__dirname, 'node_modules', '@opennextjs', 'cloudflare', 'node_modules', '@opennextjs', 'aws', 'dist', 'build', 'createServerBundle.js');
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  const original = 'external: [\"next\", \"./middleware.mjs\", \"./next-server.runtime.prod.js\"]';
  const patched = 'external: [\"next\", \"./middleware.mjs\", \"./next-server.runtime.prod.js\", \"pg\", \"pg-cloudflare\"]';
  if (content.includes(original)) {
    content = content.replace(original, patched);
    fs.writeFileSync(file, content);
    console.log('[patch] Added pg and pg-cloudflare to esbuild externals');
  } else {
    console.log('[patch] Already patched or format changed');
  }
} else {
  console.error('[patch] File not found:', file);
}
