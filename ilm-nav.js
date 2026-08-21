/* =========================================================
   ilm-nav.js
   شريط التنقّل الموحّد لصفحات المحاضرات ذات التصميم المستقل

   السلوك المطلوب:
   - زرّا "السابق / التالي"  →  ينقلان إلى اليوم السابق/التالي في
     جدول المرحلة (عبر كل المواد)، لا إلى محاضرة أخرى من نفس المادة.
   - القائمة المنسدلة        →  للتنقل بين محاضرات نفس المادة فقط.
   - الشريط يُحقن مرتين: أعلى المحاضرة (بعد صندوق الإتمام)
     وأسفلها (مكان #ilm-custom-nav القديم أو قبل نهاية body).

   المتطلبات في الصفحة (قبل هذا الملف):
   <script src="../../../data.js"></script>
   <script src="../../../ilm-nav.js"></script>

   يعتمد على SITE_DATA من data.js. إن لم يوجد، يخرج بصمت
   ويترك أي شريط قديم كما هو.
   ========================================================= */
(function () {
  'use strict';

  if (typeof SITE_DATA === 'undefined' || !SITE_DATA.stages) return;

  /* ---------- تحديد المحاضرة الحالية ---------- */
  function currentLectureId() {
    // أولوية لمعامل ?p= (المحاضرة الممتدة على عدة أيام)
    try {
      var p = new URLSearchParams(location.search).get('p');
      if (p) return p;
    } catch (e) {}
    return document.body.getAttribute('data-lecture-id') || null;
  }

  var LID = currentLectureId();
  if (!LID) return;

  /* ---------- البحث عن اليوم والمادة ---------- */
  var ctx = null; // { stage, days, dayIdx, subject }
  Object.keys(SITE_DATA.stages).forEach(function (sid) {
    if (ctx) return;
    var stage = SITE_DATA.stages[sid];
    // أيام المحاضرات فقط — تُتخطّى أيام الراحة والامتحان (لا روابط لها)
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
    ctx = { stage: stage, days: days, dayIdx: idx, subject: subj };
  });
  if (!ctx) return;

  var TO_STAGE = '../../';   // من stage-X/subject/lectures/ إلى stage-X/
  var TO_SUBJ = '../';       // من lectures/ إلى مجلد المادة

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- بناء HTML الشريط ---------- */
  var prev = ctx.dayIdx > 0 ? ctx.days[ctx.dayIdx - 1] : null;
  var next = ctx.dayIdx < ctx.days.length - 1 ? ctx.days[ctx.dayIdx + 1] : null;

  function dayBtn(d, dir) {
    if (!d) {
      return '<span class="inv-link inv-disabled">' +
        (dir === 'prev' ? '→ لا يوجد يوم سابق' : 'لا يوجد يوم تالٍ ←') + '</span>';
    }
    var arrowR = dir === 'prev' ? '→ ' : '';
    var arrowL = dir === 'next' ? ' ←' : '';
    // تمييز الانتقال إلى مادة أخرى
    var otherSubject = ctx.subject && d.subjectKey !== ctx.subject.key;
    var subjLine = d.subjectName
      ? '<span class="inv-subj' + (otherSubject ? ' inv-subj-other' : '') + '">' +
        (otherSubject ? '⇄ ' : '') + esc(d.subjectName) + '</span>'
      : '';
    return '<a class="inv-link" href="' + esc(TO_STAGE + d.link) + '">' +
      '<span class="inv-day">' + arrowR + 'اليوم ' + d.day + arrowL + '</span>' +
      '<span class="inv-ttl">' + esc(d.title) + '</span>' + subjLine + '</a>';
  }

  var jumpHtml = '';
  if (ctx.subject && ctx.subject.lectures && ctx.subject.lectures.length > 1) {
    var opts = ctx.subject.lectures.slice().sort(function (a, b) { return a.day - b.day; })
      .map(function (l) {
        return '<option value="' + esc(TO_SUBJ + l.file) + '"' +
          (l.id === LID ? ' selected' : '') + '>' +
          esc(l.n + '. ' + l.title) + '</option>';
      }).join('');
    jumpHtml =
      '<div class="inv-jump">' +
      '<label>الانتقال إلى محاضرة أخرى من «' + esc(ctx.subject.name) + '»:</label>' +
      '<select onchange="if(this.value) window.location.href=this.value;">' + opts + '</select>' +
      '</div>';
  }

  function barHtml(pos) {
    return '<div class="ilm-nav-bar ilm-nav-' + pos + '">' +
      '<div class="inv-row">' + dayBtn(prev, 'prev') + dayBtn(next, 'next') + '</div>' +
      jumpHtml + '</div>';
  }

  /* ---------- الأنماط ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.ilm-nav-bar{max-width:700px;margin:22px auto;padding:16px 18px;' +
    'background:#fbfaf4;border:1px solid #d3d8ca;border-radius:14px;' +
    "font-family:'Tajawal','IBM Plex Sans Arabic','Segoe UI',Tahoma,sans-serif;" +
    'direction:rtl;color:#2b2a24;}' +
    '.ilm-nav-bar .inv-row{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;}' +
    '.ilm-nav-bar .inv-link{flex:1 1 0;min-width:150px;text-align:center;text-decoration:none;' +
    'padding:10px 14px;border:1.5px solid #1f4a3d;border-radius:999px;color:#1f4a3d;' +
    'font-size:13.5px;font-weight:600;transition:background .15s,color .15s;' +
    'display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;}' +
    '.ilm-nav-bar .inv-link:hover{background:#1f4a3d;color:#fff;}' +
    '.ilm-nav-bar .inv-day{font-size:11.5px;opacity:.75;font-weight:500;}' +
    '.ilm-nav-bar .inv-ttl{font-size:13.5px;}' +
    '.ilm-nav-bar .inv-subj{font-size:11px;opacity:.7;font-weight:500;}' +
    '.ilm-nav-bar .inv-subj-other{opacity:.95;color:#8a6a1f;font-weight:600;}' +
    '.ilm-nav-bar .inv-link:hover .inv-subj-other{color:#f0dfae;}' +
    '.ilm-nav-bar .inv-disabled{flex:1 1 0;min-width:150px;text-align:center;padding:10px 14px;' +
    'border:1.5px solid #b3ac9e;border-radius:999px;color:#6a6a5b;opacity:.45;' +
    'font-size:13.5px;font-weight:600;}' +
    '.ilm-nav-bar .inv-jump{margin-top:14px;}' +
    '.ilm-nav-bar .inv-jump label{display:block;font-size:12.5px;color:#6a6a5b;margin-bottom:6px;}' +
    '.ilm-nav-bar select{width:100%;padding:10px 12px;border:1px solid #d3d8ca;border-radius:8px;' +
    'background:#fff;color:#2b2a24;font-family:inherit;font-size:14px;cursor:pointer;}' +
    '@media print{.ilm-nav-bar{display:none;}}';
  document.head.appendChild(css);

  /* ---------- الحقن: أعلى المحاضرة وأسفلها ---------- */
  function mount() {
    // الأسفل: يحل محل الشريط القديم إن وُجد
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

    // الأعلى: بعد صندوق الإتمام، وإلا قبل منطقة المحتوى
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
