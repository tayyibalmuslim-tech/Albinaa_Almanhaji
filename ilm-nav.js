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
    var bodyId = document.body.getAttribute('data-lecture-id') || null;
    try {
      var p = new URLSearchParams(location.search).get('p');
      if (p) {
        // بعض الصفحات تستخدم ?p=stage... كمعرّف كامل (مثل الحديث)،
        // وبعضها تستخدم ?p=1 / ?p=2 لأجزاء محاضرة واحدة (مثل علوم القرآن).
        if (/^stage\d+_/.test(p)) return p;
        if (/^\d+$/.test(p) && bodyId) return bodyId + '_p' + p;
      }
    } catch (e) {}
    return bodyId;
  }

  var LID = currentLectureId();
  if (!LID) return;

  /* ---------- بناء تسلسل المحاضرات من المواد نفسها ---------- */
  var ctx = null; // { stage, days, dayIdx, subject }
  Object.keys(SITE_DATA.stages).forEach(function (sid) {
    if (ctx) return;
    var stage = SITE_DATA.stages[sid];
    var days = [];

    (stage.subjects || []).forEach(function (subject, subjectOrder) {
      (subject.lectures || []).forEach(function (lecture, lectureOrder) {
        days.push({
          kind: 'lecture',
          day: Number(lecture.day) || 9999,
          lectureId: lecture.id,
          subjectKey: subject.key,
          subjectName: subject.name,
          title: lecture.title,
          link: subject.key + '/' + lecture.file,
          _subjectOrder: subjectOrder,
          _lectureOrder: lectureOrder
        });
      });
    });

    days.sort(function (a, b) {
      return a.day - b.day || a._subjectOrder - b._subjectOrder || a._lectureOrder - b._lectureOrder;
    });

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
    '.ilm-nav-bar{max-width:760px;margin:24px auto;padding:18px;background:#fffdf8;' +
    'border:1px solid rgba(46,70,59,.18);border-radius:18px;box-shadow:0 8px 26px rgba(28,45,38,.06);' +
    "font-family:'Tajawal','IBM Plex Sans Arabic','Segoe UI',Tahoma,sans-serif;" +
    'direction:rtl;color:#24312c;}' +
    '.ilm-nav-bar:before{content:"التنقّل بين المحاضرات";display:block;margin-bottom:12px;' +
    'font-size:12px;font-weight:800;color:#8a6a1f;letter-spacing:.02em;}' +
    '.ilm-nav-bar .inv-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
    '.ilm-nav-bar .inv-link{min-width:0;text-align:right;text-decoration:none;padding:12px 14px;' +
    'border:1px solid rgba(31,74,61,.22);border-radius:12px;color:#1f4a3d;background:#fff;' +
    'font-size:13.5px;font-weight:700;transition:transform .15s,background .15s,border-color .15s;' +
    'display:flex;flex-direction:column;gap:3px;justify-content:center;}' +
    '.ilm-nav-bar .inv-link:hover{background:#f3f7f3;border-color:#1f4a3d;transform:translateY(-1px);}' +
    '.ilm-nav-bar .inv-day{font-size:11.5px;color:#7a837d;font-weight:700;}' +
    '.ilm-nav-bar .inv-ttl{font-size:14px;line-height:1.55;color:#24312c;}' +
    '.ilm-nav-bar .inv-subj{font-size:11.5px;color:#6d776f;font-weight:500;}' +
    '.ilm-nav-bar .inv-subj-other{color:#9a7424;font-weight:700;}' +
    '.ilm-nav-bar .inv-disabled{min-width:0;text-align:center;padding:12px 14px;' +
    'border:1px dashed #c9cec8;border-radius:12px;color:#929992;background:#fafaf7;opacity:.75;' +
    'font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;}' +
    '.ilm-nav-bar .inv-jump{margin-top:14px;padding-top:14px;border-top:1px solid rgba(46,70,59,.12);}' +
    '.ilm-nav-bar .inv-jump label{display:block;font-size:12px;color:#727b75;margin-bottom:7px;font-weight:600;}' +
    '.ilm-nav-bar select{width:100%;padding:10px 12px;border:1px solid #d5dad5;border-radius:10px;' +
    'background:#fff;color:#24312c;font-family:inherit;font-size:13.5px;cursor:pointer;outline:none;}' +
    '.ilm-nav-bar select:focus{border-color:#1f4a3d;box-shadow:0 0 0 3px rgba(31,74,61,.08);}' +
    '@media(max-width:620px){.ilm-nav-bar{margin:18px 12px;padding:14px}.ilm-nav-bar .inv-row{grid-template-columns:1fr}.ilm-nav-bar .inv-link{text-align:center}}' +
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
