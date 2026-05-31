/**
 * Audit produktov Sylex — Sensing systems.
 * Prejde kategóriu, nájde produkty a pre každý vypíše čo má a čo CHÝBA
 * (popis, špecifikácie/tabuľka, dokumenty/PDF, obrázky).
 *
 * Spusti z PC/siete, kde web normálne funguje (cloud má bot-blok 403):
 *   node scripts/auditSylex.js
 *   node scripts/auditSylex.js https://www.sylex.sk/category/sensing-systems/
 *
 * Výstup: konzola + sylex-audit.md + sylex-audit.json
 */
const https = require('https');
const fs = require('fs');
const { parse } = require('node-html-parser');

const START = process.argv[2] || 'https://www.sylex.sk/category/sensing-systems/';
const ORIGIN = 'https://www.sylex.sk';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'sk,en;q=0.8' } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        return resolve(get(r.headers.location.startsWith('http') ? r.headers.location : ORIGIN + r.headers.location));
      }
      if (r.statusCode !== 200) { r.resume(); return reject(new Error('HTTP ' + r.statusCode + ' @ ' + url)); }
      let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d));
    }).on('error', reject);
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Aké dokumenty očakávame na kompletnej stránke produktu
const DOC_TYPES = [
  { key: 'datasheet',   label: 'Datasheet',          re: /datasheet|data-sheet|technical|specifik(a|á)cia|katal(o|ó)g/i },
  { key: 'manual',      label: 'Manuál / návod',     re: /manual|user.?guide|n(a|á)vod|inštal/i },
  { key: 'certificate', label: 'Certifikát / vyhlásenie', re: /certificate|certifik|declaration|vyhl(a|á)senie|conformity|ce\b/i },
  { key: 'application', label: 'Aplikačný list',     re: /application|app.?note|case.?study|aplik/i },
  { key: 'cad',         label: 'CAD / 3D model',     re: /\.(step|stp|dwg|dxf|igs|iges)|cad|3d/i },
];

function classifyDoc(href, text) {
  const s = (href + ' ' + text).toLowerCase();
  for (const t of DOC_TYPES) if (t.re.test(s)) return t.key;
  return 'other';
}

async function auditProduct(url) {
  const html = await get(url);
  const root = parse(html);
  const title = (root.querySelector('h1')?.text || root.querySelector('title')?.text || '').trim();
  const bodyText = (root.querySelector('main')?.text || root.text || '').replace(/\s+/g, ' ').trim();
  const hasTable = !!root.querySelector('table');
  const imgs = root.querySelectorAll('img').filter(i => /\.(jpg|jpeg|png|webp|svg)/i.test(i.getAttribute('src') || '')).length;

  const docs = [];
  root.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (/\.(pdf|docx?|xlsx?|zip|step|stp|dwg)(\?|$)/i.test(href) || /download/i.test(href)) {
      docs.push({ href: href.startsWith('http') ? href : ORIGIN + href, text: a.text.trim(), type: classifyDoc(href, a.text) });
    }
  });
  const present = new Set(docs.map(d => d.type));
  const missing = DOC_TYPES.filter(t => !present.has(t.key)).map(t => t.label);

  return {
    title, url,
    hasDescription: bodyText.length > 200,
    hasSpecsTable: hasTable,
    images: imgs,
    documents: docs,
    missingDocs: missing,
  };
}

(async () => {
  console.log('Načítavam kategóriu:', START);
  let catHtml;
  try { catHtml = await get(START); }
  catch (e) { console.error('CHYBA:', e.message, '\n→ Spusti to z PC/siete s prístupom na sylex.sk.'); process.exit(1); }

  const root = parse(catHtml);
  const links = new Set();
  root.querySelectorAll('a').forEach(a => {
    let href = a.getAttribute('href') || '';
    if (!href) return;
    if (!href.startsWith('http')) href = ORIGIN + href;
    // produktové/podstránky v rámci sensing-systems, vynechaj samotnú kategóriu
    if (/\/sensing-systems\//.test(href) && !/\/category\//.test(href)) links.add(href.split('#')[0]);
  });
  const products = [...links];
  console.log(`Našiel som ${products.length} odkazov na produkty/stránky.\n`);

  const results = [];
  for (const url of products) {
    try {
      const a = await auditProduct(url);
      results.push(a);
      console.log(`✓ ${a.title || url}`);
      console.log(`   popis: ${a.hasDescription ? 'áno' : 'CHÝBA'} · špecifikácie: ${a.hasSpecsTable ? 'áno' : 'CHÝBA'} · obrázky: ${a.images} · dokumenty: ${a.documents.length}`);
      if (a.missingDocs.length) console.log(`   ⚠️ chýbajúce typy dokumentov: ${a.missingDocs.join(', ')}`);
    } catch (e) { console.log(`✗ ${url} — ${e.message}`); }
    await sleep(400);
  }

  // Výstup
  fs.writeFileSync('sylex-audit.json', JSON.stringify(results, null, 2));
  let md = `# Audit produktov — Sylex Sensing systems\n\n_Vygenerované: ${new Date().toLocaleString('sk-SK')}_\n\nSpolu produktov: ${results.length}\n\n`;
  results.forEach(r => {
    md += `## ${r.title || r.url}\n${r.url}\n\n`;
    md += `- Popis: ${r.hasDescription ? '✅' : '❌ chýba'}\n`;
    md += `- Špecifikácie (tabuľka): ${r.hasSpecsTable ? '✅' : '❌ chýba'}\n`;
    md += `- Obrázky: ${r.images}\n`;
    md += `- Dokumenty (${r.documents.length}): ${r.documents.map(d => `${d.text || d.type} (${d.href})`).join('; ') || '—'}\n`;
    md += `- ⚠️ Chýbajúce typy dokumentov: ${r.missingDocs.length ? r.missingDocs.join(', ') : 'žiadne'}\n\n`;
  });
  fs.writeFileSync('sylex-audit.md', md);
  console.log('\nHotovo → sylex-audit.md a sylex-audit.json');
})();
