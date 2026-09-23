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
const vm = require('node:vm');

/* ============ معايير البند 9 ============ */
const MIN_CARDS = 20;          // 9-ح: النزول عن 20 مؤشر تفريط
const LOW_CARDS = 25;          // النطاق الموصى به للمحاضرة
// ملاحظات(1): لا سقف عددي؛ يحكم الاختيارَ استقلالُ الفائدة وعدمُ التكرار.
const SHORT_FRONT = 40;        // 11: عدّ كل وجه أمامي أقصر من ~40 حرفًا
const QUOTA_L12_MIN = 0.40;    // 9-ز
const QUOTA_NAMES_MAX = 0.15;
const QUOTA_STORY_MAX = 0.20;

/* 9-ب: الإحالة إلى الجلسة */
const REF_SESSION = [
  'ذكر الشيخ', 'ذكرها الشيخ', 'قال الشيخ', 'أشار الشيخ', 'رشّح الشيخ', 'وصفها الشيخ',
  'بحسب الشيخ', 'بحسب شرح الشيخ', 'كما شرحه الشيخ', 'كما فصّلها الشيخ', 'ضربه الشيخ',
  'في المحاضرة', 'هذه المحاضرة', 'بحسب المحاضرة', 'المحاضر', 'في الدرس', 'هذا الدرس',
  'في هذا اللقاء', 'في اللقاء السابق', 'في اللقاء الماضي', 'في هذه الحلقة', 'في هذا المقطع', 'في هذا الملف',
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
  const m = /(?:const|let|var)\s+(CARDS_DATA|CARDS|ankiCards)\s*=\s*\[/.exec(src);
  if (!m) return null;
  const arr = sliceArray(src, m.index + m[0].length - 1);
  if (!arr) return null;
  try { return { name: m[1], data: vm.runInNewContext('(' + arr + ')', Object.create(null), {timeout: 1000}) }; }
  catch (e) { return { name: m[1], error: e.message }; }
}

/* جميع صيغ البيانات القائمة، مع تشخيص الصيغ القديمة عند الفحص. */
const frontRaw = c => String((c.front ?? c.q ?? c.f ?? c[0]) ?? '');
const backRaw = c => String((c.back ?? c.a ?? c.b ?? c[1]) ?? '');
const front = c => strip(frontRaw(c));
const back = c => strip(backRaw(c));

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
  r.track = isBook ? 'كتاب' : 'محاضرة';

  /* 9-ح: العدد */
  if (D.length < MIN_CARDS) r.fail.push(`العدد ${D.length} < ${MIN_CARDS} (تفريط — 9-ح)`);
  else if (D.length < LOW_CARDS) r.warn.push(`العدد ${D.length} دون النطاق ${LOW_CARDS}`);
  if (got.name !== 'CARDS_DATA') r.fail.push('مصدر البطاقات يجب أن يكون CARDS_DATA');

  /* 9-ط: الحقول */
  D.forEach((c, i) => {
    if (!Number.isInteger(c.level) || c.level < 1 || c.level > 6) r.fail.push(`بطاقة #${i+1}: level مفقود أو غير صالح`);
    if (!strip(c.anchor)) r.fail.push(`بطاقة #${i+1}: anchor مفقود`);
    if (typeof c.tags !== 'string' || c.tags.split('::').length < 3 || /[ \t\r\n]/.test(c.tags)) r.fail.push(`بطاقة #${i+1}: Tags هرمي مفقود أو يحتوي مسافة عادية`);
  });

  /* 9-ط: التصدير */
  const dl = /#separator:tab/.test(src) && /#tags column:3/.test(src);
  if (!/ankiTag|Tags|tags column/.test(src)) r.fail.push('التصدير بلا عمود Tags هرمي (9-ط)');
  if (/#deck:|#columns:[^\n]*Deck/.test(src)) r.fail.push('التصدير يحوي عمود Deck (ممنوع — 9-ط)');
  if (!/\\uFEFF|\\ufeff/.test(src)) r.warn.push('لم يُعثر على BOM في التصدير');
  if (!dl) r.warn.push('لم يُعثر على بنية بناء الـTSV');

  /* فحص البطاقات */
  let nRef = 0, nMem = 0, nShort = 0, nNoText = 0, nDangling = 0, nDup = 0;
  const seen = new Map(), badRef = [], badMem = [];
  D.forEach((c, i) => {
    const f = front(c), b = back(c);
    if (!f || !b) r.fail.push(`بطاقة #${i+1}: وجه فارغ`);
    if (f.length < SHORT_FRONT) nShort++;
    for (const w of REF_SESSION) if (f.includes(w) || b.includes(w)) { nRef++; badRef.push(`#${i+1} «${w}»`); break; }
    for (const w of MEMORIZE) if (f.includes(w)) { nMem++; badMem.push(`#${i+1} «${w}»`); break; }
    for (const w of DANGLING) if (f.includes(w)) { nDangling++; break; }
    /* 9-د/ثانيًا: إحضار النص شرط */
    if (/(هذه الآية|هذا الحديث|قوله تعالى|قول النبي|دلالة الآية|دلالة الحديث)/.test(f) && !hasText(frontRaw(c)) && !hasText(backRaw(c))) nNoText++;
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
  if (D.length) {
    const n = D.length, cnt = l => D.filter(c => c.level === l).length;
    const p12 = (cnt(1) + cnt(2)) / n, pn = cnt(6) / n, ps = cnt(5) / n;
    r.quota = { L12: +(p12 * 100).toFixed(0), names: +(pn * 100).toFixed(0), stories: +(ps * 100).toFixed(0) };
    if (p12 < QUOTA_L12_MIN) r.fail.push(`المستويان 1+2 = ${r.quota.L12}% < 40% (9-ز)`);
    if (pn > QUOTA_NAMES_MAX) r.fail.push(`الأعلام والتواريخ = ${r.quota.names}% > 15% (9-ز)`);
    if (ps > QUOTA_STORY_MAX) r.fail.push(`القصص = ${r.quota.stories}% > 20% (9-ز)`);
  }
  return r;
}

/* ============ التشغيل ============ */
function main() {
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
process.exitCode = failed.length ? 1 : 0;
}
if (require.main === module) main();
module.exports = { extractCards, auditFile, front, back };
