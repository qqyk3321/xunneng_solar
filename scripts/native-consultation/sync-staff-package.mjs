// The staff app is a separate Git repository; vendor the package so npm ci is standalone.
// Bump consultation-core's version before distributing an updated package.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'../..'),staff=resolve(root,'ticket-query-local');
mkdirSync(resolve(staff,'vendor'),{recursive:true});
const result=JSON.parse(execFileSync('npm',['pack','./packages/consultation-core','--pack-destination','ticket-query-local/vendor','--json'],{cwd:root,encoding:'utf8'}))[0];
execFileSync('npm',['install',`./vendor/${result.filename}`,'--ignore-scripts','--no-audit','--no-fund'],{cwd:staff,stdio:'inherit'});
const source=JSON.parse(readFileSync(resolve(root,'packages/consultation-core/package.json'),'utf8'));
console.log(`Staff package ${source.name}@${source.version} is ready. Include the vendor archive and both package files in the staff change.`);
