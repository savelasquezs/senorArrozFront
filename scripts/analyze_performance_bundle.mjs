import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const directory = resolve(process.argv[2] || 'dist');
const manifest = JSON.parse(readFileSync(resolve(directory, '.vite/manifest.json'), 'utf8'));
const entry = Object.keys(manifest).find(key => manifest[key].isEntry);
const layout = Object.keys(manifest).find(key => key === 'src/components/layout/MainLayout.vue' || manifest[key].name === 'MainLayout');
function filesFor(keys) {
  const visited = new Set(), files = new Set();
  function visit(key) {
    if (visited.has(key) || !manifest[key]) return;
    visited.add(key);
    const item = manifest[key];
    files.add(item.file);
    for (const css of item.css || []) files.add(css);
    for (const imported of item.imports || []) visit(imported);
  }
  keys.forEach(visit);
  return [...files];
}
function summarize(keys) {
  const files = filesFor(keys);
  let javascript = 0, gzip = 0, css = 0;
  for (const file of files) {
    const bytes = readFileSync(resolve(directory, file));
    if (file.endsWith('.js')) { javascript += bytes.length; gzip += gzipSync(bytes).length; }
    if (file.endsWith('.css')) css += bytes.length;
  }
  return { javascript, gzipEstimated: gzip, css, files };
}
const views = new Set(readdirSync(resolve('src/views')).filter(name => name.endsWith('.vue')).map(name => name.slice(0, -4)));
const routes = Object.keys(manifest).filter(key => manifest[key].isDynamicEntry && views.has(manifest[key].name));
process.stdout.write(JSON.stringify({ entry: summarize([entry]), routes: Object.fromEntries(routes.map(route => [manifest[route].name,
  summarize([entry, ...(!['ForgotPassword', 'ResetPassword', 'Login'].includes(manifest[route].name) && layout ? [layout] : []), route])])) }, null, 2) + '\n');
