#!/usr/bin/env node
/**
 * tools/check-anki.js — فحص اتساق بطاقات Anki عبر كل المحاضرات (آلية العمل 5.11 — 9-ص و11)
 *
 *   node tools/check-anki.js                      # كل صفحات المستودع
 *   node tools/check-anki.js path/to/page.html    # صفحة محددة
 *   node tools/check-anki.js --legacy             # يعرض أيضًا الصفحات القديمة التي لا تستعمل ilm-anki.js
 *
 * يفحص الصفحات التي تحمّل ilm-anki.js فقط (النظام الموحّد)، ويطبع أرقامًا لا نصوصًا.
 * لا يعدّل شيئًا. رمز الخروج 1 عند أي مخالفة حاسمة.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const showLegacy = args.includes('--legacy');
const targets = args.filter(a => !a.startsWith('--'));

function walk(d, out) {
  for (const f of fs.readdirSync(d)) {
    if (f === '.git' || f === 'node_modules') continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out); else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}
function grabArray(src, name) {
  const m = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*').exec(src);
  if (!m) return null;
  let i = m.index + m[0].length, open = src[i], close = open === '[' ? ']' : '}', depth = 0, inStr = null;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (inStr) { if (ch === '\\') { j++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === open) depth++; else if (ch === close && --depth === 0) return vm.runInNewContext('(' + src.slice(i, j + 1) + ')');
  }
  return null;
}
function loadSiteData(htmlPath) {
  let d = path.dirname(htmlPath);
  while (d.startsWith(ROOT)) {
    const f = path.join(d, 'data.js');
    if (fs.existsSync(f)) { const ctx = {}; vm.runInNewContext(fs.readFileSync(f, 'utf8') + ';this.SITE_DATA=SITE_DATA;', ctx); return ctx.SITE_DATA; }
    d = path.dirname(d);
  }
  return null;
}
function loadExporter(htmlPath) {
  let d = path.dirname(htmlPath);
  while (d.startsWith(ROOT)) {
    const f = path.join(d, 'ilm-anki.js');
    if (fs.existsSync(f)) { delete require.cache[f]; return require(f); }
    d = path.dirname(d);
  }
  return null;
}

const pages = targets.length ? targets.map(t => path.resolve(t)) : walk(ROOT, []);
const TAG_RE = /^[^\s:]+(::[^\s:]+)*::محاضرة_\d{2} أولوية_[1-6]$/;
const allGuids = new Map();
let fails = 0, checked = 0, legacy = [];

for (const p of pages) {
  const src = fs.readFileSync(p, 'utf8');
  if (!src.includes('CARDS_DATA')) continue;
  const tagM = /<script[^>]*src="[^"]*ilm-anki\.js"([^>]*)>/.exec(src);
  if (!tagM) { legacy.push(path.relative(ROOT, p)); continue; }
  checked++;
  const rel = path.relative(ROOT, p), errs = [];
  const attrs = {}; tagM[1].replace(/data-([a-z-]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; });
  const lid = (/data-lecture-id="([^"]+)"/.exec(src) || [])[1];
  const cards = grabArray(src, 'CARDS_DATA');
  const names = grabArray(src, 'ANKI_NAMES') || grabArray(src, 'NAMES');
  const X = loadExporter(p);
  if (!X) errs.push('ilm-anki.js غير موجود في المستودع');
  if (!lid) errs.push('لا data-lecture-id');
  if (!attrs.lecture) errs.push('لا data-lecture على وسم ilm-anki.js');
  if (!Array.isArray(cards)) errs.push('تعذّر قراءة CARDS_DATA');
  let out = null;
  if (!errs.length) {
    try {
      X.configure({ siteData: attrs.series ? null : loadSiteData(p), lectureId: lid, lecture: attrs.lecture, series: attrs.series || null, names, href: 'https://example/x.html' });
      const v = X.validate(cards);
      v.filter(x => !x.startsWith('بلا src')).forEach(x => errs.push(x));
      const noSrc = v.filter(x => x.startsWith('بلا src')).length;
      out = X.tsv(cards);
      const lines = out.split('\n');
      if (lines.slice(0, 5).join('|') !== '#separator:tab|#html:true|#guid column:1|#deck column:4|#tags column:5') errs.push('أسطر الإعداد غير مطابقة');
      const rows = lines.slice(5).map(l => l.split('\t'));
      rows.forEach(r => {
        if (r.length !== 5) errs.push('عدد أعمدة ≠ 5');
        if (!TAG_RE.test(r[4])) errs.push('وسم غير مطابق: ' + r[4]);
        const g = r[0];
        if (allGuids.has(g) && allGuids.get(g) !== rel) errs.push('GUID مكرر مع ' + allGuids.get(g) + ': ' + g);
        allGuids.set(g, rel);
      });
      const per = {}; cards.forEach(c => { per[c.level] = (per[c.level] || 0) + 1; });
      console.log(`${errs.length ? '✗' : '✓'} ${rel} | بطاقات ${cards.length} | أولويات ${JSON.stringify(per)} | بلا src ${noSrc} | وسم: ${X.meta().tag}`);
    } catch (e) { errs.push(e.message); }
  }
  if (errs.length) { fails++; if (!out) console.log('✗ ' + rel); [...new Set(errs)].slice(0, 8).forEach(e => console.log('    - ' + e)); }
}
console.log(`\nصفحات بالنظام الموحّد: ${checked} — مخالفة: ${fails} — صفحات قديمة لم تُحوَّل: ${legacy.length}`);
if (showLegacy) legacy.forEach(l => console.log('    قديم: ' + l));
process.exit(fails ? 1 : 0);
