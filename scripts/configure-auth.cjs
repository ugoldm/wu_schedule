const fs = require('node:fs');
const [projectUrl, key] = process.argv.slice(2);
let url;
try { url = new URL(projectUrl); } catch (_) { throw new Error('Provide a Supabase project URL and a publishable key.'); }
if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
  throw new Error('Use the HTTPS project URL from Supabase, without a path or credentials.');
}
if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key || '')) throw new Error('Only an sb_publishable_… key is accepted. Do not supply secret keys.');
const config = { supabaseUrl: url.origin, supabasePublishableKey: key, semesterCode: '26W' };
fs.writeFileSync('docs/auth-config.js', '// Public browser settings. Never add secret keys here.\nwindow.WU_AUTH_CONFIG = Object.freeze(' + JSON.stringify(config, null, 2) + ');\n');
const html = fs.readFileSync('docs/index.html', 'utf8').replace(/connect-src[^;]+;/, `connect-src 'self' ${url.origin};`);
fs.writeFileSync('docs/index.html', html);
require('./version-assets.cjs').versionAssets();
console.log('Public Google-auth configuration saved. Configure Google OAuth and apply the database migrations before deploying.');
