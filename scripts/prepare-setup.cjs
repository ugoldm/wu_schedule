const fs = require('node:fs');
const migrations = fs.readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort();
const statements = migrations.map(file => fs.readFileSync(`supabase/migrations/${file}`, 'utf8').replace(/^begin;\s*$/gm, '').replace(/^commit;\s*$/gm, ''));
fs.writeFileSync('supabase/setup.local.sql', '-- Initial setup for a new project. Run once in the Supabase SQL editor.\nbegin;\n' + statements.join('\n') + '\ncommit;\n');
console.log('Created supabase/setup.local.sql for initial setup (excluded from Git).');
