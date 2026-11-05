import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root,'dist');
const catalog = JSON.parse(fs.readFileSync(path.join(root,'src/data/catalog.json'),'utf8'));
const base = (process.env.SITE_BASE || '/').replace(/\/?$/, '/');
const website = (process.env.SITE_URL || 'https://example.com').replace(/\/$/, '');
const paths = ['','apps/','about/','legal/',...catalog.apps.map(a=>`apps/${a.key}/`)];
const assert=(ok,message)=>{if(!ok)throw Error(message);};

for(const rel of paths) {
  const filename = path.join(dist,rel,'index.html');
  assert(fs.existsSync(filename),'Missing static page: '+filename);
  if(!rel || rel==='apps/') {
    const html=fs.readFileSync(filename,'utf8');
    assert(html.includes('Cockpit'),'Missing Cockpit branding in '+filename);
    assert(!/1panel/i.test(html),'Legacy brand in public page '+filename);
  }
}
const appDirs=fs.readdirSync(path.join(dist,'apps'),{withFileTypes:true}).filter(f=>f.isDirectory()).length;
assert(appDirs===catalog.apps.length,`Expected ${catalog.apps.length} static app detail pages, found ${appDirs}`);
const listHtml=fs.readFileSync(path.join(dist,'apps/index.html'),'utf8');
const cardCount=(listHtml.match(/<a\b[^>]*\sdata-app-card\b/g)||[]).length;
assert(cardCount===catalog.apps.length,`Expected ${catalog.apps.length} cards, found ${cardCount}`);
assert(fs.existsSync(path.join(dist,'data/apps.json')),'Missing search index');
assert(fs.existsSync(path.join(dist,'data/manifest.json')),'Missing manifest');
const esc=(s)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const urls=paths.map(p=>`${website}${base}${p}`);
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  urls.map(url=>`  <url><loc>${esc(url)}</loc></url>`).join('\n')+'\n</urlset>\n';
fs.writeFileSync(path.join(dist,'sitemap.xml'),sitemap);
fs.writeFileSync(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${website}${base}sitemap.xml\n`);
console.log(`verified ${appDirs} detail pages, ${cardCount} catalog cards, sitemap and robots.txt`);
