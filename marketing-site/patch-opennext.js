const fs = require('fs');
const path = require('path');

// Patch OpenNext AWS createServerBundle to externalize pg and pg-cloudflare
const file1 = path.join(__dirname, 'node_modules', '@opennextjs', 'cloudflare', 'node_modules', '@opennextjs', 'aws', 'dist', 'build', 'createServerBundle.js');
if (fs.existsSync(file1)) {
  let content = fs.readFileSync(file1, 'utf8');
  const original1 = 'external: ["next", "./middleware.mjs", "./next-server.runtime.prod.js"]';
  const patched1 = 'external: ["next", "./middleware.mjs", "./next-server.runtime.prod.js", "pg", "pg-cloudflare"]';
  if (content.includes(original1)) {
    content = content.replace(original1, patched1);
    fs.writeFileSync(file1, content);
    console.log('[patch] createServerBundle: Added pg and pg-cloudflare to esbuild externals');
  } else {
    console.log('[patch] createServerBundle: Already patched or format changed');
  }
} else {
  console.error('[patch] File not found:', file1);
}

// Patch OpenNext AWS bundleNextServer to externalize pg and pg-cloudflare
const file2 = path.join(__dirname, 'node_modules', '@opennextjs', 'cloudflare', 'node_modules', '@opennextjs', 'aws', 'dist', 'build', 'bundleNextServer.js');
if (fs.existsSync(file2)) {
  let content = fs.readFileSync(file2, 'utf8');
  const original2 = '"next/dist/compiled/compression",';
  const patched2 = '"next/dist/compiled/compression",\n    "pg",\n    "pg-cloudflare",';
  if (content.includes(original2) && !content.includes('"pg",')) {
    content = content.replace(original2, patched2);
    fs.writeFileSync(file2, content);
    console.log('[patch] bundleNextServer: Added pg and pg-cloudflare to esbuild externals');
  } else {
    console.log('[patch] bundleNextServer: Already patched or format changed');
  }
} else {
  console.error('[patch] File not found:', file2);
}

// Patch pg/lib/stream.js to make pg-cloudflare an optional dependency
// This prevents esbuild from failing when it can't resolve pg-cloudflare
const file3 = path.join(__dirname, 'node_modules', 'pg', 'lib', 'stream.js');
if (fs.existsSync(file3)) {
  let content = fs.readFileSync(file3, 'utf8');
  const original3 = "const { CloudflareSocket } = require('pg-cloudflare')";
  const patched3 = `let CloudflareSocket;
  try {
    CloudflareSocket = require('pg-cloudflare').CloudflareSocket;
  } catch (e) {
    CloudflareSocket = undefined;
  }`;
  if (content.includes(original3)) {
    content = content.replace(original3, patched3);
    fs.writeFileSync(file3, content);
    console.log('[patch] pg/lib/stream.js: Made pg-cloudflare optional');
  } else {
    console.log('[patch] pg/lib/stream.js: Already patched or format changed');
  }
} else {
  console.error('[patch] File not found:', file3);
}

// Patch copyTracedFiles.js to handle EPERM on Windows symlinks by falling back to copy
const copyTracedFilesPaths = [
  path.join(__dirname, 'node_modules', '@opennextjs', 'aws', 'dist', 'build', 'copyTracedFiles.js'),
  path.join(__dirname, 'node_modules', '@opennextjs', 'cloudflare', 'node_modules', '@opennextjs', 'aws', 'dist', 'build', 'copyTracedFiles.js'),
];
const originalSymlinkCatch = `            catch (e) {
                if (e.code !== "EEXIST") {
                    throw e;
                }
            }`;
const patchedSymlinkCatch = `            catch (e) {
                if (e.code === "EEXIST") {
                    // ignore
                } else if (e.code === "EPERM" && process.platform === "win32") {
                    // Fallback to copy on Windows when symlink permission denied
                    if (statSync(from).isDirectory()) {
                        cpSync(from, to, { recursive: true, dereference: true });
                    } else {
                        copyFileAndMakeOwnerWritable(from, to);
                    }
                } else {
                    throw e;
                }
            }`;
for (const ctfPath of copyTracedFilesPaths) {
  if (fs.existsSync(ctfPath)) {
    let content = fs.readFileSync(ctfPath, 'utf8');
    if (content.includes(originalSymlinkCatch) && !content.includes('EPERM')) {
      content = content.replace(originalSymlinkCatch, patchedSymlinkCatch);
      fs.writeFileSync(ctfPath, content);
      console.log('[patch] copyTracedFiles: Added EPERM fallback for Windows symlinks');
    } else {
      console.log('[patch] copyTracedFiles: Already patched or format changed');
    }
  } else {
    console.error('[patch] File not found:', ctfPath);
  }
}
