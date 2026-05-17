#!/usr/bin/env node
// Post-build script: normalize Windows backslash paths in the OpenNext handler bundle.
// On Windows, the OpenNext bundler embeds .next\server\ style paths in the VFS.
// Cloudflare Workers runtime uses path.join with / separators, so VFS lookups fail.
// This script replaces backslash path separators with forward slashes in the bundle.

const fs = require('fs');
const path = require('path');

const handlerPath = path.join(__dirname, '..', '.open-next', 'server-functions', 'default', 'handler.mjs');

if (!fs.existsSync(handlerPath)) {
  console.error('handler.mjs not found at', handlerPath);
  process.exit(1);
}

let content = fs.readFileSync(handlerPath, 'utf8');
const original = content;

// Replace Windows-style paths in VFS file registry:
//   ".next\\server\\foo.json"  →  ".next/server/foo.json"
// We target strings starting with ".next\\ or '.\\.next\\' patterns only,
// preserving regex literals and other legitimate uses of backslash.
// In JS source files, \\ represents a single \ at runtime.
// We want to replace each \\ (path separator) with / (forward slash).
// Regex /\\\\/g matches pairs of consecutive backslashes.
content = content.replace(/"((?:[^"\\]|\\[\s\S])*?)"/g, (match, inner) => {
  // Only fix strings that look like VFS file paths (start with .next)
  // Check by temporarily replacing \\ pairs to see if it starts with .next
  const testInner = inner.replace(/\\\\/g, '/');
  if (/^\.next\//.test(testInner)) {
    return '"' + inner.replace(/\\\\/g, '/') + '"';
  }
  return match;
});

// Also fix absoluteAppDir which has full Windows path - zero it out (not needed at runtime)
content = content.replace(/absoluteAppDir:"[^"]*?\\[^"]*?"/g, 'absoluteAppDir:""');

if (content === original) {
  console.log('No Windows paths found to fix — bundle may already be clean or built on Linux.');
} else {
  const countFixed = (original.match(/\"[^"]*\\[^"]*\"/g) || []).length;
  console.log(`Fixed ${countFixed} backslash path(s) in handler.mjs`);
  fs.writeFileSync(handlerPath, content, 'utf8');
  console.log('Written:', handlerPath);
}
