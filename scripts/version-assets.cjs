const fs = require('node:fs');
const { createHash } = require('node:crypto');
function versionAssets() {
  const path = 'docs/sw.js';
  const source = fs.readFileSync(path, 'utf8');
  const files = [...source.match(/const PRECACHE = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']+)'/g)].map(match => match[1]);
  const hash = createHash('sha256');
  hash.update(source.replace(/const CACHE_NAME = [^\n]+/, 'const CACHE_NAME = VERSION;'));
  for (const file of files) { hash.update(file); hash.update(fs.readFileSync(`docs/${file}`)); }
  const version = hash.digest('hex').slice(0, 16);
  fs.writeFileSync(path, source.replace(/const CACHE_NAME = [^\n]+/, 'const CACHE_NAME = `${CACHE_PREFIX}' + version + '`;'));
  console.log('Public asset cache version updated.');
}
if (require.main === module) versionAssets();
module.exports = { versionAssets };
