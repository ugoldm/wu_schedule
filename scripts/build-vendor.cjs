const { buildSync } = require('esbuild');
const fs = require('node:fs');
buildSync({
  stdin: { contents: "export { createClient } from '@supabase/supabase-js';", resolveDir: process.cwd() },
  bundle: true, platform: 'browser', format: 'iife', globalName: 'supabase',
  minify: true, outfile: 'docs/vendor/supabase.js', legalComments: 'eof', target: ['es2022']
});
fs.copyFileSync('node_modules/@supabase/supabase-js/LICENSE', 'docs/vendor/SUPABASE-LICENSE');
const dependencies = [
  '@supabase/supabase-js', '@supabase/auth-js', '@supabase/functions-js',
  '@supabase/postgrest-js', '@supabase/realtime-js', '@supabase/storage-js',
  '@supabase/phoenix', 'tslib', 'iceberg-js'
];
const notices = dependencies.map(name => {
  const folder = `node_modules/${name}`;
  const pkg = JSON.parse(fs.readFileSync(`${folder}/package.json`, 'utf8'));
  const licenses = fs.readdirSync(folder).filter(file => /^(LICENSE|COPYING|NOTICE)(\.|$)/i.test(file));
  return `${name}@${pkg.version} — ${pkg.license || 'see license'}\n` + licenses.map(file => fs.readFileSync(`${folder}/${file}`, 'utf8').replace(/\r\n/g, '\n')).join('\n');
});
fs.writeFileSync('docs/vendor/THIRD-PARTY-LICENSES.txt', notices.join('\n\n--------------------\n\n'));
require('./version-assets.cjs').versionAssets();
