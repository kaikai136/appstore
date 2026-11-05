import fs from 'node:fs';
const p=new URL('../src/data/catalog.json',import.meta.url);
if (!fs.existsSync(p)) throw Error('Missing catalog.json (run data:generate)');
const {manifest,categories,apps}=JSON.parse(fs.readFileSync(p,'utf8'));
const keys=new Set();
for (const app of apps) {
  if(!app.key || !app.name || keys.has(app.key)) throw Error('Invalid/duplicate app: '+app.key);
  keys.add(app.key);
  if (app.displayStatus === 'cockpit-compatible') throw Error('Unverified compatibility: '+app.key);
  if (!fs.existsSync(new URL('../src/data/details/'+app.key+'.json',import.meta.url))) throw Error('Missing app detail: '+app.key);
}
if(apps.length!==manifest.total || categories.length<1) throw Error('Bad manifest/category count');
console.log(`validated ${apps.length} catalog apps / ${categories.length} categories; source ${manifest.sourceRevision}`);
