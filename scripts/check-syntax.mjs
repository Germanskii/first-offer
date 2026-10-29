import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

function modules(directory) {
  return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'vendor' ? [] : modules(path);
    return /\.(?:js|mjs)$/.test(entry.name) ? [path] : [];
  });
}

const paths = ['server.mjs', ...['dist/client', 'dist/server', 'scripts', 'tests'].flatMap(modules)];
for (const path of paths) {
  const result = spawnSync(process.execPath, ['--check', path], {stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax valid: ${paths.length} JavaScript modules`);
