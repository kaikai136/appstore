import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.resolve(process.env.APPSTORE_SOURCE || path.join(projectDir, '..'));
const sourceApps = path.join(sourceDir, 'apps');
const generated = path.join(projectDir, 'src/data');
const iconsDir = path.join(projectDir, 'public/icons');
const publicData = path.join(projectDir, 'public/data');
const detailsDir = path.join(generated, 'details');
const warnings = [];
const seenKeys = new Set();

function readYaml(file) {
  return YAML.parse(fs.readFileSync(file, 'utf8')) ?? {};
}
function text(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}
function metadata(app) { return app?.additionalProperties ?? {}; }
function bool(value) { return value === true; }
function safeUrl(value) {
  if (typeof value !== 'string') return undefined;
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined;
  } catch { return undefined; }
}
function localized(obj, language, fallback = '') {
  if (typeof obj === 'string') return obj;
  return text(obj?.[language] ?? obj?.[language === 'zh' ? 'zh-Hant' : 'en'], fallback);
}
function sanitizeMarkdown(markdown) {
  // Drop source-platform-specific guidance, not original third-party product names.
  const clean = markdown.replace(/^.*1panel.*(?:\r?\n|$)/gim, '');
  const html = marked.parse(clean, { gfm: true, breaks: false });
  return sanitizeHtml(String(html), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 's', 'del']),
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src','alt','title','width','height'], a: ['href','title','target','rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) }
  });
}
function versionKey(str) {
  return str.split(/[.-]/).map(x => /^\d+$/.test(x) ? x.padStart(8, '0') : x).join('.');
}
function valueFields(form) {
  return (Array.isArray(form) ? form : []).map(field => {
    const key = text(field.envKey);
    const t = text(field.type,'text');
    const sensitive = t === 'password' || /SECRET|TOKEN|PASSWORD|API.?KEY|PRIVATE|CREDENTIAL/i.test(key);
    return {
      key,
      label: localized(field.label, 'zh', text(field.labelZh, key)),
      type: t,
      required: bool(field.required),
      sensitive
    };
  }).filter(f=> f.key);
}
function readDetails(dir, key) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const versions = [];
  for (const item of items) {
    if (!item.isDirectory()) continue;
    const versionDir = path.join(dir, item.name);
    const config = path.join(versionDir, 'data.yml');
    const compose = path.join(versionDir, 'docker-compose.yml');
    if (!fs.existsSync(config) && !fs.existsSync(compose)) continue;
    try {
      const data = fs.existsSync(config) ? readYaml(config) : {};
      const fields = valueFields(metadata(data).formFields);
      const composeText = fs.existsSync(compose) ? fs.readFileSync(compose,'utf8') : '';
      const templateUrl = composeText ? `/data/compose/${encodeURIComponent(key)}/${encodeURIComponent(item.name)}/docker-compose.yaml` : '';
      if (composeText) {
        const outputDir = path.join(publicData, 'compose', key, item.name);
        fs.mkdirSync(outputDir, { recursive: true });
        fs.copyFileSync(compose, path.join(outputDir, 'docker-compose.yaml'));
      }
      versions.push({
        id: item.name,
        fields,
        templateAvailable: !!composeText,
        templateUrl,
        needsSourcePlatform: /PANEL_|1panel-network|1panel:/i.test(composeText),
        gpuTemplate: /runtime:\s*nvidia|capabilities:\s*\[\s*gpu\s*\]/i.test(composeText)
      });
    } catch (err) { warnings.push(`${key}/${item.name}: ${err.message}`); }
  }
  versions.sort((a,b)=>versionKey(b.id).localeCompare(versionKey(a.id)));
  return versions;
}
function prepareOutput() {
  for (const dir of [generated, detailsDir, iconsDir, publicData]) fs.mkdirSync(dir,{recursive:true});
}
function main() {
  if (!fs.existsSync(sourceApps)) throw Error(`Cannot find source apps directory: ${sourceApps}. Set APPSTORE_SOURCE.`);
  prepareOutput();
  const rootMeta = readYaml(path.join(sourceDir,'data.yaml'));
  const config = readYaml(path.join(projectDir,'src/config/catalog-overrides.yaml'));
  const excluded = new Set(config.exclude || []);
  const categories = (metadata(rootMeta).tags || []).filter(c=>c && c.key && c.key !== 'Local').map(c=>({
    key:c.key,
    label:localized(c.locales,'zh',text(c.name,c.key)),
    sort: typeof c.sort === 'number' ? c.sort : 9999
  })).sort((a,b)=>a.sort-b.sort);
  const categoryByLabel = new Map(categories.flatMap(c=>[[c.key.toLowerCase(), c.key],[c.label.toLowerCase(),c.key]]));
  const apps = [];
  let rejected=0;
  for (const entry of fs.readdirSync(sourceApps,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || excluded.has(entry.name)) continue;
    const key = entry.name;
    const dir = path.join(sourceApps,key);
    const metaFile = path.join(dir,'data.yml');
    if (!fs.existsSync(metaFile)) { warnings.push(`${key}: missing data.yml`); rejected++; continue; }
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(key) || seenKeys.has(key)) throw Error(`Invalid or duplicate application key: ${key}`);
    seenKeys.add(key);
    try {
      const raw = readYaml(metaFile);
      const props = metadata(raw);
      const variants = readDetails(dir,key);
      if (!variants.length) warnings.push(`${key}: no version directory found`);
      const names = [raw.name,props.name].map(x=>text(x)).filter(Boolean);
      const name = names[0] || key;
      const categoryTags = (props.tags?.length ? props.tags : (raw.tags||[]));
      const appCats = Array.from(new Set(categoryTags.map(t=>categoryByLabel.get(String(t).toLowerCase())).filter(Boolean)));
      const logo = path.join(dir,'logo.png');
      let icon = '';
      if (fs.existsSync(logo)) {
        const target = path.join(iconsDir, key + '.png');
        fs.copyFileSync(logo,target);
        icon = `/icons/${key}.png`;
      }
      const readmeZh = path.join(dir,'README.md');
      const readmeEn = path.join(dir,'README_en.md');
      const description = localized(props.description,'zh',text(props.shortDescZh,text(raw.title,text(raw.description,''))));
      const descriptionEn = localized(props.description,'en',text(props.shortDescEn,description));
      const fields = variants.flatMap(v=>v.fields);
      const app = {
        key,
        name,
        summary: description || text(raw.title, name),
        summaryEn: descriptionEn,
        categories: appCats,
        icon,
        type: text(props.type),
        architectures: Array.isArray(props.architectures)?props.architectures.map(String):[],
        gpuSupport: bool(props.gpuSupport) || variants.some(v=>v.gpuTemplate),
        memoryRequiredMiB: Number.isFinite(Number(props.memoryRequired)) ? Number(props.memoryRequired) : null,
        versions: variants.map(v=>v.id),
        featured: (config.featured||[]).includes(key),
        recommendWeight: Number(props.recommend)||0,
        website: safeUrl(props.website),
        repository: safeUrl(props.github),
        documentation: safeUrl(props.document),
        displayStatus:'compose-reference'
      };
      apps.push(app);
      fs.writeFileSync(path.join(detailsDir,`${key}.json`),JSON.stringify({
        ...app,
        versionsDetailed: variants,
        readmeZh:fs.existsSync(readmeZh)?sanitizeMarkdown(fs.readFileSync(readmeZh,'utf8')):'',
        readmeEn:fs.existsSync(readmeEn)?sanitizeMarkdown(fs.readFileSync(readmeEn,'utf8')):'',
        sourcePath:`apps/${key}`,
        availableFields: Array.from(new Set(fields.map(f=>f.key))).length
      }));
    } catch(err) {
      rejected++;
      warnings.push(`${key}: ${err.stack||err.message}`);
    }
  }
  if (!apps.length) throw Error('No valid applications');
  const sha = process.env.SOURCE_SHA || (()=>{try{return execFileSync('git',['-C',sourceDir,'rev-parse','HEAD'],{encoding:'utf8'}).trim()}catch{return 'unknown'}})();
  const manifest={sourceRevision:sha, generatedAt:new Date().toISOString(),total:apps.length,rejected,warnings:warnings.length};
  const result = {manifest,categories,apps};
  fs.writeFileSync(path.join(generated,'catalog.json'),JSON.stringify(result));
  fs.writeFileSync(path.join(publicData,'apps.json'),JSON.stringify({manifest,categories,apps}));
  fs.writeFileSync(path.join(publicData,'manifest.json'),JSON.stringify(manifest));
  fs.writeFileSync(path.join(publicData,'warnings.json'),JSON.stringify(warnings));
  const searchHash=crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex').slice(0,12);
  console.log(`catalog: ${apps.length} apps, ${categories.length} categories, ${rejected} rejected, ${warnings.length} warnings, hash ${searchHash}`);
  warnings.slice(0,20).forEach(w=>console.warn('WARN',w));
}
main();
