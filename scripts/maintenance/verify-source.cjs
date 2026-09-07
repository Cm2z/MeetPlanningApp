const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const file = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(js|mjs|vue)$/.test(file)) files.push(file);
  }
}
for (const dir of ['frontend/src', 'backend/src', 'backend/tests']) walk(dir);
const source = fs.readFileSync(path.join(root, 'frontend/src/composables/useMeetPlanning.js'), 'utf8');
const returnedState = source.slice(source.lastIndexOf('  return {'));
const stateKeys = new Set([...returnedState.matchAll(/^\s+(\w+),?$/gm)].map(match => match[1]));
let imports = 0;
for (const file of files) {
  const absolute = path.join(root, file);
  const text = fs.readFileSync(absolute, 'utf8');
  for (const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)(['"])(\.{1,2}\/[^'"\r\n]+)\1/g)) {
    const target = path.resolve(path.dirname(absolute), match[2]);
    if (!fs.existsSync(target)) throw new Error(`${file}: missing import ${match[2]}`);
    // Windows accepts incorrect case, while Linux deployment does not.
    let cursor = root;
    for (const part of path.relative(root, target).split(path.sep)) {
      if (!fs.readdirSync(cursor).includes(part)) throw new Error(`${file}: import case mismatch ${match[2]}`);
      cursor = path.join(cursor, part);
    }
    imports++;
  }
  if (file.startsWith('frontend/src/')) {
    for (const match of text.matchAll(/\bstate\??\.(\w+)/g)) {
      if (!stateKeys.has(match[1])) throw new Error(`${file}: missing state.${match[1]}`);
    }
  }
  if (file.startsWith('backend/') && /\.(mjs|js)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
  }
}
for (const project of ['frontend', 'backend']) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, project, 'package.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(root, project, 'package-lock.json')));
  for (const group of ['dependencies', 'devDependencies']) {
    const sorted = object => JSON.stringify(Object.entries(object || {}).sort(([a], [b]) => a.localeCompare(b)));
    if (sorted(manifest[group]) !== sorted(lock.packages[''][group])) {
      throw new Error(`${project}: package-lock.json does not match ${group}`);
    }
  }
}
console.log(`PASS: ${files.length} source files, ${imports} imports (including Linux case), state bindings, backend syntax, and lockfiles.`);
