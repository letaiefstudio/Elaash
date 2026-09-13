import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

// Rollup ships platform-specific native binaries as optional dependencies.
// npm can occasionally omit the Linux binary from a lockfile generated on Windows.
// Cloudflare Pages builds on Linux, so ensure the matching binary is present
// immediately before Vite/Rollup runs. This is intentionally a no-op elsewhere.
if (process.platform !== 'linux' || process.arch !== 'x64') {
  process.exit(0);
}

const require = createRequire(import.meta.url);
const nativePackage = '@rollup/rollup-linux-x64-gnu';

try {
  require.resolve(nativePackage);
  process.exit(0);
} catch {
  // Continue and install the exact native package matching the installed Rollup.
}

const rollupPackagePath = join(process.cwd(), 'node_modules', 'rollup', 'package.json');
if (!existsSync(rollupPackagePath)) {
  console.error('[build] Rollup is not installed. Run npm install first.');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(rollupPackagePath, 'utf8'));
if (!version) {
  console.error('[build] Could not determine the installed Rollup version.');
  process.exit(1);
}

console.log(`[build] Installing missing ${nativePackage}@${version} for Linux build...`);
execFileSync('npm', [
  'install',
  '--no-save',
  '--no-package-lock',
  '--ignore-scripts',
  `${nativePackage}@${version}`,
], {
  stdio: 'inherit',
  cwd: process.cwd(),
});
