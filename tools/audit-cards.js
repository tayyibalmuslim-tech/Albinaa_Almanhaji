#!/usr/bin/env node
/**
 * tools/audit-cards.js — فحص آلي لبطاقات Anki في مشروع «البناء المنهجي»
 * مرجع الفحص: آلية العمل 5.3.1 — البند 9 (البطاقات) والبند 11 (الفحص التقني).
 *
 * الاستعمال:
 *   node tools/audit-cards.js                 # فحص كل الملفات
 *   node tools/audit-cards.js stage-1         # فحص مسار محدد
 *   node tools/audit-cards.js --json          # مخرَج JSON للأتمتة
 *
 * السكريبت لا يعدّل شيئًا. يطبع أرقامًا لا نصوصًا (بند 0-هـ/2).
 * رمز الخروج: 0 إذا لم توجد مخالفة حاسمة، 1 إذا وُجدت.
 */

'use strict';
const fs = require('fs');
const path = require('path');

/* ============ معايير البند 9 ============ */
const MIN_CARDS = 20;          // 9-ح: النزول عن 20 مؤشر تفريط
const LOW_CARDS = 25;          // النطاق الموصى به للمحاضرة
const MAX_CARDS = 40;          // 9-ح: تجاوز الأعلى مؤشر تفتيت (50 للكتب)
const MAX_CARDS_BOOK = 50;
const SHORT_FRONT = 40;        // 11: عدّ كل وجه أمامي أقصر من ~40 حرفًا
const QUOTA_L12_MIN = 0.40;    // 9-ز
const QUOTA_NAMES_MAX = 0.15;
const QUOTA_STORY_MAX = 0.20;

/* 9-ب: الإحالة إلى الجلسة */
const REF_SESSION = [
  'ذكر الشيخ', 'ذكرها الشيخ', 'قال الشيخ', 'أشار الشيخ', 'رشّح الشيخ', 'وصفها الشيخ',
  'بحسب الشيخ', 'بحسب شرح الشيخ', 'كما شرحه الشيخ', 'كما فصّلها الشيخ', 'ضربه الشيخ',
  'في المحاضرة', 'هذه المحاضرة', 'بحسب المحاضرة', 'المحاضر', 'في الدرس', 'هذا الدرس',
  'في هذا اللقاء', 'في اللقاء السابق', 'في اللقاء الماضي', 'في الحلقة', 'في هذا المقطع', 'في هذا الملف',
  'ما المثال الذي ضربه', 'ما الآية التي استدل بها'
];
/* 9-د/أولًا: أسئلة الحفظ */
const MEMORIZE = [
  'في أي سورة', 'أين وردت', 'أكمل الآية', 'أتمم الآية', 'ما بقية الحديث', 'أكمل الحديث',
  'ما تتمة', 'في أي آية', 'ما رقم الآية', 'اذكر نص الآية', 'وكم مرة وردت'
];
/* 9-أ: ضمير عائد على غائب بلا مرساة */
const DANGLING = [
  'ما المقصود بذلك', 'ما هذا؟', 'هذه القاعدة؟', 'هذا المثال؟', 'ما سببها؟', 'ما وجهه؟'
];

/* ============ أدوات ============ */
const strip = s => String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const hasText = s => /[﴿﴾«»]/.test(String(s == null ? '' : s));

function walk(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '.git' && e.name !== 'node_modules') walk(p, out); }
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/* استخراج مصفوفة البطاقات بمطابقة الأقواس مع تجاهل ما داخل النصوص */
function sliceArray(src, from) {
  const i = src.indexOf('[', from);
  if (i < 0) return null;
  let depth = 0, q = null, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (q) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === q) q = null;
    } else if (c === '"' || c === "'" || c === '`') q = c;
    else if (c === '[') depth++;
    else if (c === ']') { if (--depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

function extractCards(src) {
  const m = /(?:const|let|var)\s+(CARDS_DATA|CARDS)\s*=\s*\[/.exec(src);
  if (!m) return null;
  const arr = sliceArray(src, m.index + m[0].length - 1);
  if (!arr) return null;
  try { return { name: m[1], data: new Function('return (' + arr + ')')() }; }
  catch (e) { return { name: m[1], error: e.message }; }
}

/* البطاقات في المشروع تستعمل صيغتين: {q,a} و{f,b} */
const front = c => strip(c.q !== undefined ? c.q : c.f);
const back  = c => strip(c.a !== undefined ? c.a : c.b);
const frontRaw = c => String((c.q !== undefined ? c.q : c.f) || '');
const backRaw  = c => String((c.a !== undefined ? c.a : c.b) || '');

/* ============ الفحص ============ */
function auditFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const got = extractCards(src);
  const r = { file, cards: 0, fail: [], warn: [] };
  if (!got) { r.skip = 'لا مصفوفة بطاقات'; return r; }
  if (got.error) { r.fail.push('تعذّر تقييم المصفوفة: ' + got.error); return r; }

  const D = got.data;
  r.cards = D.length;
  const isBook = /aside class="note"/.test(src);      // مسار الكتب (بند 7-ج)
  const cap = isBook ? MAX_CARDS_BOOK : MAX_CARDS;
  r.track = isBook ? 'كتاب' : 'محاضرة';

  /* 9-ح: العدد */
  if (D.length < MIN_CARDS) r.fail.push(`العدد ${D.length} < ${MIN_CARDS} (تفريط — 9-ح)`);
  else if (D.length < LOW_CARDS) r.warn.push(`العدد ${D.length} دون النطاق ${LOW_CARDS}`);
  if (D.length > cap) r.fail.push(`العدد ${D.length} > ${cap} (تفتيت — 9-ح)`);

  /* 9-ط: الحقول */
  const keys = new Set(); D.forEach(c => Object.keys(c).forEach(k => keys.add(k)));
  if (!keys.has('level')) r.fail.push('حقل level مفقود (9-ط)');
  if (!keys.has('anchor')) r.warn.push('حقل anchor مفقود (9-ط)');

  /* 9-ط: التصدير */
  const dl = /\.map\([\s\S]{0,400}?\\t[\s\S]{0,400}?\)/.test(src);
  if (!/ankiTag|Tags|tags column/.test(src)) r.fail.push('التصدير بلا عمود Tags هرمي (9-ط)');
  if (/\bDeck\b/.test(src)) r.fail.push('التصدير يحوي عمود Deck (ممنوع — 9-ط)');
  if (!/\\uFEFF|\\ufeff/.test(src)) r.warn.push('لم يُعثر على BOM في التصدير');
  if (!dl) r.warn.push('لم يُعثر على بنية بناء الـTSV');

  /* فحص البطاقات */
  let nRef = 0, nMem = 0, nShort = 0, nNoText = 0, nDangling = 0, nDup = 0;
  const seen = new Map(), badRef = [], badMem = [];
  D.forEach((c, i) => {
    const f = front(c), b = back(c);
    if (!f || !b) r.fail.push(`بطاقة #${i}: وجه فارغ`);
    if (f.length < SHORT_FRONT) nShort++;
    for (const w of REF_SESSION) if (f.includes(w) || b.includes(w)) { nRef++; badRef.push(`#${i} «${w}»`); break; }
    for (const w of MEMORIZE) if (f.includes(w)) { nMem++; badMem.push(`#${i} «${w}»`); break; }
    for (const w of DANGLING) if (f.includes(w)) { nDangling++; break; }
    /* 9-د/ثانيًا: إحضار النص شرط */
    if (/(الآية|الآيات|آية|الحديث|حديث)/.test(f) && !hasText(frontRaw(c)) && !hasText(backRaw(c))) nNoText++;
    const k = f.replace(/\s/g, '');
    if (seen.has(k)) nDup++; else seen.set(k, i);
  });
  if (nRef) r.fail.push(`إحالة إلى الجلسة في ${nRef} بطاقة (9-ب): ${badRef.slice(0, 5).join('، ')}`);
  if (nMem) r.fail.push(`سؤال حفظ في ${nMem} بطاقة (9-د): ${badMem.slice(0, 5).join('، ')}`);
  if (nDup) r.fail.push(`${nDup} بطاقة مكرَّرة الوجه الأمامي (9-و)`);
  if (nDangling) r.warn.push(`${nDangling} بطاقة بضمير غائب بلا مرساة (9-أ)`);
  if (nShort) r.warn.push(`${nShort} وجهًا أماميًا أقصر من ${SHORT_FRONT} حرفًا — راجع اختبار الاستقلال (9-أ)`);
  if (nNoText) r.warn.push(`${nNoText} بطاقة تُحيل إلى آية/حديث بلا إحضار نصه (9-د)`);

  /* 9-ز: الحصص — تُحسب فقط عند وجود level */
  if (keys.has('level')) {
    const n = D.length, cnt = l => D.filter(c => c.level === l).length;
    const p12 = (cnt(1) + cnt(2)) / n, pn = cnt(6) / n, ps = cnt(5) / n;
    r.quota = { L12: +(p12 * 100).toFixed(0), names: +(pn * 100).toFixed(0), stories: +(ps * 100).toFixed(0) };
    if (p12 < QUOTA_L12_MIN) r.fail.push(`المستويان 1+2 = ${r.quota.L12}% < 40% (9-ز)`);
    if (pn > QUOTA_NAMES_MAX) r.fail.push(`الأعلام والتواريخ = ${r.quota.names}% > 15% (9-ز)`);
    if (ps > QUOTA_STORY_MAX) r.warn.push(`القصص = ${r.quota.stories}% > 20% (9-ز)`);
  }
  return r;
}

/* ============ التشغيل ============ */
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const root = args.find(a => !a.startsWith('--')) || path.join(__dirname, '..');
const files = walk(path.resolve(root)).filter(f => !/\/index\.html$/.test(f));

const results = files.map(auditFile).filter(r => !r.skip);
const failed = results.filter(r => r.fail.length);

if (asJson) {
  console.log(JSON.stringify({ scanned: files.length, withCards: results.length, failed: failed.length, results }, null, 1));
} else {
  console.log(`فُحص ${files.length} ملفًا — ${results.length} منها فيه بطاقات\n`);
  for (const r of results) {
    const tag = r.fail.length ? '✗' : (r.warn.length ? '!' : '✓');
    const q = r.quota ? `  [1+2:${r.quota.L12}% أعلام:${r.quota.names}%]` : '';
    console.log(`${tag} ${path.relative(process.cwd(), r.file)}  (${r.cards} بطاقة / ${r.track})${q}`);
    r.fail.forEach(m => console.log('    ✗ ' + m));
    r.warn.forEach(m => console.log('    ! ' + m));
  }
  console.log(`\nالنتيجة: ${results.length - failed.length}/${results.length} ملفًا بلا مخالفة حاسمة.`);
}
process.exit(failed.length ? 1 : 0);
