import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const projectDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(projectDir,process.argv[2]||'public');
const fail=message=>{throw new Error(`Source validation failed: ${message}`)};
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sourceFile=path.join(root,'source.json');
const source=readJson(sourceFile);
if(source.schemaVersion!==1||!source.sourceId||!source.name||!source.index) fail('invalid source descriptor');
const sourceDir=path.join(root,'source');
const indexFile=path.resolve(root,source.index);
if(indexFile!==sourceDir&&!indexFile.startsWith(sourceDir+path.sep)) fail('index path escapes source directory');
const index=readJson(indexFile);
if(index.schemaVersion!==source.schemaVersion||index.sourceId!==source.sourceId||!Array.isArray(index.catalog)) fail('source index metadata mismatch');
if(index.catalog.length!==source.appCount||index.catalog.length!==index.appCount) fail('app count mismatch');

const resolveAsset=(fromFile,url)=>{
  if(typeof url!=='string'||/^[a-z][a-z\d+.-]*:/i.test(url)||url.startsWith('//')) fail(`invalid asset URL: ${url}`);
  const decoded=decodeURIComponent(url.split(/[?#]/,1)[0]);
  const target=path.resolve(path.dirname(fromFile),decoded);
  if(target!==root&&!target.startsWith(root+path.sep)) fail(`asset escapes source root: ${url}`);
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()) fail(`missing asset: ${url}`);
  return target;
};

const appIds=new Set();
for(const entry of index.catalog){
  if(!entry.key||entry.id!==`${source.sourceId}/${entry.key}`||appIds.has(entry.id)) fail(`invalid or duplicate app identity: ${entry.id}`);
  appIds.add(entry.id);
  const manifestFile=resolveAsset(indexFile,entry.manifest);
  const app=readJson(manifestFile);
  if(app.schemaVersion!==source.schemaVersion||app.sourceId!==source.sourceId||app.id!==entry.id||!Array.isArray(app.versions)) fail(`invalid app manifest: ${entry.key}`);
  if(entry.icon) resolveAsset(indexFile,entry.icon);
  if(app.icon) resolveAsset(manifestFile,app.icon);
  for(const version of app.versions){
    if(!version.version||!Array.isArray(version.architectures)||!Array.isArray(version.fields)) fail(`invalid version metadata: ${entry.key}`);
    if(!version.compose) continue;
    const composeFile=resolveAsset(manifestFile,version.compose.url);
    const digest=crypto.createHash('sha256').update(fs.readFileSync(composeFile)).digest('hex');
    if(digest!==version.compose.sha256) fail(`Compose SHA-256 mismatch: ${entry.key}@${version.version}`);
    if(version.compose.filename!=='docker-compose.yaml'||version.compose.compatibility!=='unverified'||version.compose.installable!==false) fail(`unsafe deployment status: ${entry.key}@${version.version}`);
  }
}
console.log(`validated source ${source.sourceId}: ${appIds.size} apps, Compose checksums verified`);
