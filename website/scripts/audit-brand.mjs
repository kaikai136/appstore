import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src');
const offenders=[];
function scan(dir) {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.name === 'legal.astro') continue;
    if(entry.isDirectory()) scan(file);
    else if(/\.(astro|css|ts|tsx)$/.test(entry.name)) {
      const body=fs.readFileSync(file,'utf8');
      if(/1panel/i.test(body)) offenders.push(path.relative(root,file));
    }
  }
}
scan(path.join(root,'pages'));
scan(path.join(root,'components'));
scan(path.join(root,'layouts'));
if(offenders.length) throw Error('Public-facing 1Panel branding detected: '+offenders.join(', '));
console.log('Cockpit brand audit passed');
