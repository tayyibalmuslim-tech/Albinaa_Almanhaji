/* =========================================================
   ilm-nav.js  —  v3
   شريط التنقّل الموحّد لصفحات المحاضرات ذات التصميم المستقل

   الجديد في v3:
   1) تكيّف لوني تلقائي: الشريط يقرأ ألوان الصفحة المضيفة فعليًا
      (الخلفية، لون النص، لون الإبراز) ويشتقّ منها ألوانه — فلا يبدو
      غريبًا فوق أي هوية بصرية، ولا يحتاج تعديلًا في كل ملف.
   2) شريط مسار (breadcrumb): المرحلة / المادة / المحاضرة — اليوم.
   3) القائمة المنسدلة لمحاضرات المادة تظهر أعلى الصفحة وأسفلها.
   4) إعادة اشتقاق الألوان عند تبديل الوضع الليلي في الصفحة.

   السلوك:
   - زرّا "السابق / التالي"  →  اليوم السابق/التالي في جدول المرحلة
     (عبر كل المواد)، لا محاضرة أخرى من نفس المادة.
   - القائمة المنسدلة        →  محاضرات نفس المادة فقط.

   المتطلبات في الصفحة:
   <script src="../../../data.js"></script>
   <script src="../../../ilm-nav.js"></script>
   مع <body data-lecture-id="stageN_subject_NN">
   ========================================================= */
(function () {
  'use strict';

  if (typeof SITE_DATA === 'undefined' || !SITE_DATA.stages) return;

  /* ============ 1) تحديد المحاضرة الحالية ============ */
  function currentLectureId() {
    try {
      var p = new URLSearchParams(location.search).get('p');
      if (p) return p;
    } catch (e) {}
    return document.body.getAttribute('data-lecture-id') || null;
  }

  var LID = currentLectureId();
  if (!LID) return;

  /* ============ 2) سياق المرحلة/المادة/اليوم ============ */
  var ctx = null;
  Object.keys(SITE_DATA.stages).forEach(function (sid) {
    if (ctx) return;
    var stage = SITE_DATA.stages[sid];
    var days = (stage.days || []).filter(function (d) {
      return d.kind === 'lecture' && d.link && d.lectureId;
    }).sort(function (a, b) { return a.day - b.day; });
    var idx = -1;
    for (var i = 0; i < days.length; i++) {
      if (days[i].lectureId === LID) { idx = i; break; }
    }
    if (idx === -1) return;
    var subj = null;
    (stage.subjects || []).forEach(function (s) {
      if (s.key === days[idx].subjectKey) subj = s;
    });
    ctx = { sid: sid, stage: stage, days: days, dayIdx: idx, subject: subj };
  });
  if (!ctx) return;

  var TO_STAGE = '../../';
  var TO_SUBJ = '../';
  var TO_ROOT = '../../../';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ============ 3) اشتقاق الألوان من الصفحة المضيفة ============ */
  function parseColor(str) {
    if (!str) return null;
    var m = String(str).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(',').map(function (x) { return parseFloat(x); });
    if (p.length < 3 || p.some(isNaN)) return null;
    if (p.length > 3 && p[3] === 0) return null;
    return { r: p[0], g: p[1], b: p[2] };
  }

  function lum(c) { return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255; }

  function rgb(c) {
    return 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')';
  }
  function rgba(c, a) {
    return 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + a + ')';
  }
  function mix(a, b, t) {
    return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
  }

  function effectiveBg(el) {
    var node = el;
    while (node && node !== document.documentElement) {
      var c = parseColor(getComputedStyle(node).backgroundColor);
      if (c) return c;
      node = node.parentElement;
    }
    var h = parseColor(getComputedStyle(document.documentElement).backgroundColor);
    return h || { r: 255, g: 255, b: 255 };
  }

  function accentColor(bg, fg) {
    var rootStyle = getComputedStyle(document.documentElement);
    var names = ['--accent', '--acc', '--gold', '--brand', '--primary', '--main',
                 '--c-accent', '--color-accent', '--link', '--theme', '--ink-accent'];
    for (var i = 0; i < names.length; i++) {
      var v = (rootStyle.getPropertyValue(names[i]) || '').trim();
      if (!v) continue;
      var probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;color:' + v;
      document.body.appendChild(probe);
      var c = parseColor(getComputedStyle(probe).color);
      probe.parentNode.removeChild(probe);
      if (c && Math.abs(lum(c) - lum(bg)) > 0.12) return c;
    }
    var el = document.querySelector('a[href]:not([href^="#"])') || document.querySelector('h1,h2');
    if (el) {
      var c2 = parseColor(getComputedStyle(el).color);
      if (c2 && Math.abs(lum(c2) - lum(bg)) > 0.15) return c2;
    }
    return mix(fg, bg, 0.2);
  }

  function buildTheme() {
    var bg = effectiveBg(document.body);
    var fg = parseColor(getComputedStyle(document.body).color) || { r: 25, g: 25, b: 25 };
    var dark = lum(bg) < 0.45;
    var acc = accentColor(bg, fg);
    var white = { r: 255, g: 255, b: 255 }, black = { r: 0, g: 0, b: 0 };

    return {
      panel: rgb(mix(bg, dark ? white : black, dark ? 0.055 : 0.028)),
      border: rgb(mix(bg, fg, dark ? 0.24 : 0.17)),
      text: rgba(fg, 0.92),
      muted: rgba(fg, 0.56),
      accent: rgb(acc),
      accentSoft: rgba(acc, dark ? 0.18 : 0.10),
      onAccent: lum(acc) > 0.62 ? '#111111' : '#ffffff',
      field: rgb(mix(bg, dark ? white : white, dark ? 0.08 : 0.6))
    };
  }

  /* ============ 4) بناء المحتوى ============ */
  var prev = ctx.dayIdx > 0 ? ctx.days[ctx.dayIdx - 1] : null;
  var next = ctx.dayIdx < ctx.days.length - 1 ? ctx.days[ctx.dayIdx + 1] : null;
  var here = ctx.days[ctx.dayIdx];

  var lecNo = null, lecCount = 0;
  if (ctx.subject && ctx.subject.lectures) {
    lecCount = ctx.subject.lectures.length;
    ctx.subject.lectures.forEach(function (l) { if (l.id === LID) lecNo = l.n; });
  }

  function crumbHtml() {
    var parts = [];
    parts.push('<a class="inv-cr" href="' + esc(TO_ROOT + 'index.html') + '">البناء المنهجي</a>');
    parts.push('<a class="inv-cr" href="' + esc(TO_STAGE + 'index.html') + '">' + esc(ctx.stage.name) + '</a>');
    if (ctx.subject) {
      parts.push('<span class="inv-cr">' + esc(ctx.subject.name) + '</span>');
    }
    var last = (lecNo ? ('المحاضرة ' + lecNo) : String(here.title)) + ' — اليوم ' + here.day;
    parts.push('<span class="inv-cr inv-cr-now">' + esc(last) + '</span>');
    return '<nav class="inv-crumbs" aria-label="مسارك في الموقع">' +
      parts.join('<span class="inv-sep" aria-hidden="true">/</span>') + '</nav>';
  }

  function dayBtn(d, dir) {
    if (!d) {
      return '<span class="inv-link inv-disabled">' +
        '<span class="inv-day">' + (dir === 'prev' ? 'البداية' : 'النهاية') + '</span>' +
        '<span class="inv-ttl">' + (dir === 'prev' ? 'لا يوجد يوم سابق' : 'لا يوجد يوم تالٍ') + '</span>' +
        '</span>';
    }
    var arrow = dir === 'prev' ? '→' : '←';
    var other = ctx.subject && d.subjectKey !== ctx.subject.key;
    var sub = d.subjectName
      ? '<span class="inv-subj' + (other ? ' inv-subj-other' : '') + '">' +
        (other ? '⇄ ' : '') + esc(d.subjectName) + '</span>' : '';
    return '<a class="inv-link" href="' + esc(TO_STAGE + d.link) + '">' +
      '<span class="inv-day"><span class="inv-arrow">' + arrow + '</span> اليوم ' + d.day + '</span>' +
      '<span class="inv-ttl">' + esc(d.title) + '</span>' + sub + '</a>';
  }

  var jumpHtml = '';
  if (ctx.subject && ctx.subject.lectures && lecCount > 1) {
    var opts = ctx.subject.lectures.slice().sort(function (a, b) {
      return (a.n || 0) - (b.n || 0);
    }).map(function (l) {
      return '<option value="' + esc(TO_SUBJ + l.file) + '"' +
        (l.id === LID ? ' selected' : '') + '>' + esc(l.n + '. ' + l.title) + '</option>';
    }).join('');
    jumpHtml = '<div class="inv-jump">' +
      '<label>محاضرات «' + esc(ctx.subject.name) + '» — ' + lecCount + ' محاضرة</label>' +
      '<select onchange="if(this.value) window.location.href=this.value;">' + opts + '</select>' +
      '</div>';
  }

  function barHtml(pos) {
    return '<div class="ilm-nav-bar ilm-nav-' + pos + '">' + crumbHtml() +
      '<div class="inv-row">' + dayBtn(prev, 'prev') + dayBtn(next, 'next') + '</div>' +
      jumpHtml + '</div>';
  }

  /* ============ 5) الأنماط ============ */
  var styleEl = document.createElement('style');
  styleEl.id = 'ilm-nav-style';
  styleEl.textContent = [
    '.ilm-nav-bar{--inv-panel:#fafafa;--inv-border:#dddddd;--inv-text:#222222;',
    '--inv-muted:#777777;--inv-accent:#33564a;--inv-accent-soft:rgba(51,86,74,.1);',
    '--inv-on-accent:#ffffff;--inv-field:#ffffff;',
    'max-width:760px;margin:26px auto;padding:14px 16px;box-sizing:border-box;',
    'background:var(--inv-panel);border:1px solid var(--inv-border);border-radius:14px;',
    'font-family:inherit;direction:rtl;color:var(--inv-text);line-height:1.6;}',
    '.ilm-nav-bar *{box-sizing:border-box;}',
    '.ilm-nav-bar .inv-crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:2px 4px;',
    'font-size:12px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--inv-border);}',
    '.ilm-nav-bar .inv-cr{color:var(--inv-muted);text-decoration:none;padding:2px 4px;border-radius:5px;}',
    '.ilm-nav-bar a.inv-cr:hover{color:var(--inv-accent);background:var(--inv-accent-soft);}',
    '.ilm-nav-bar .inv-cr-now{color:var(--inv-accent);font-weight:700;}',
    '.ilm-nav-bar .inv-sep{color:var(--inv-muted);opacity:.5;font-size:11px;}',
    '.ilm-nav-bar .inv-row{display:flex;gap:10px;flex-wrap:wrap;}',
    '.ilm-nav-bar .inv-link,.ilm-nav-bar .inv-disabled{flex:1 1 220px;min-width:0;',
    'display:flex;flex-direction:column;gap:3px;text-align:center;align-items:center;',
    'justify-content:center;padding:11px 14px;border-radius:11px;font-size:13.5px;font-weight:600;}',
    '.ilm-nav-bar .inv-link{text-decoration:none;color:var(--inv-accent);',
    'border:1.5px solid var(--inv-accent);background:transparent;',
    'transition:background .16s ease,color .16s ease;}',
    '.ilm-nav-bar .inv-link:hover,.ilm-nav-bar .inv-link:focus-visible{',
    'background:var(--inv-accent);color:var(--inv-on-accent);outline:none;}',
    '.ilm-nav-bar .inv-link:hover .inv-day,.ilm-nav-bar .inv-link:hover .inv-subj{opacity:.95;}',
    '.ilm-nav-bar .inv-disabled{border:1.5px dashed var(--inv-border);color:var(--inv-muted);opacity:.55;}',
    '.ilm-nav-bar .inv-day{font-size:11px;opacity:.8;font-weight:500;letter-spacing:.2px;}',
    '.ilm-nav-bar .inv-arrow{font-weight:700;}',
    '.ilm-nav-bar .inv-ttl{font-size:13.5px;line-height:1.45;',
    'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '.ilm-nav-bar .inv-subj{font-size:10.5px;opacity:.75;font-weight:500;}',
    '.ilm-nav-bar .inv-subj-other{opacity:1;font-weight:700;}',
    '.ilm-nav-bar .inv-jump{margin-top:12px;}',
    '.ilm-nav-bar .inv-jump label{display:block;font-size:11.5px;color:var(--inv-muted);',
    'margin-bottom:5px;font-weight:600;}',
    '.ilm-nav-bar select{width:100%;padding:9px 11px;border:1px solid var(--inv-border);',
    'border-radius:9px;background:var(--inv-field);color:var(--inv-text);font-family:inherit;',
    'font-size:13.5px;cursor:pointer;}',
    '.ilm-nav-bar select:focus-visible{outline:2px solid var(--inv-accent);outline-offset:1px;}',
    '@media (max-width:520px){.ilm-nav-bar{margin:18px 12px;padding:12px 13px;}',
    '.ilm-nav-bar .inv-link,.ilm-nav-bar .inv-disabled{flex:1 1 100%;}}',
    '@media print{.ilm-nav-bar{display:none !important;}}'
  ].join('');
  document.head.appendChild(styleEl);

  function applyTheme() {
    var t;
    try { t = buildTheme(); } catch (e) { return; }
    var bars = document.querySelectorAll('.ilm-nav-bar');
    for (var i = 0; i < bars.length; i++) {
      var el = bars[i];
      el.style.setProperty('--inv-panel', t.panel);
      el.style.setProperty('--inv-border', t.border);
      el.style.setProperty('--inv-text', t.text);
      el.style.setProperty('--inv-muted', t.muted);
      el.style.setProperty('--inv-accent', t.accent);
      el.style.setProperty('--inv-accent-soft', t.accentSoft);
      el.style.setProperty('--inv-on-accent', t.onAccent);
      el.style.setProperty('--inv-field', t.field);
    }
  }

  /* ============ 6) الحقن ============ */
  function mount() {
    if (document.querySelector('.ilm-nav-bar')) return;

    var old = document.getElementById('ilm-custom-nav');
    var bottom = document.createElement('div');
    bottom.innerHTML = barHtml('bottom');
    bottom = bottom.firstChild;
    if (old && old.parentNode) {
      old.parentNode.replaceChild(bottom, old);
    } else {
      var parts = document.getElementById('ilm-parts');
      if (parts && parts.parentNode) parts.parentNode.insertBefore(bottom, parts);
      else document.body.appendChild(bottom);
    }

    var top = document.createElement('div');
    top.innerHTML = barHtml('top');
    top = top.firstChild;
    var box = document.getElementById('ilm-completion-box');
    if (box && box.parentNode) {
      box.parentNode.insertBefore(top, box.nextSibling);
    } else {
      var zone = document.querySelector('[data-ilm-highlight-zone]');
      if (zone && zone.parentNode) zone.parentNode.insertBefore(top, zone);
      else document.body.insertBefore(top, document.body.firstChild);
    }

    applyTheme();

    try {
      var timer = null;
      var mo = new MutationObserver(function () {
        clearTimeout(timer);
        timer = setTimeout(applyTheme, 60);
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    } catch (e) {}
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
