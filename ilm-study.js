/* =========================================================
   ilm-study.js — أدوات المذاكرة المشتركة: زرار «📝 اختبار» وزرار «🧠 خريطة»
   (آلية العمل 5.13 — 7-هـ/ج-ب و7-ب-ب)

   البيانات (مصدر واحد لكل مادة):
     tests/{subjectKey}.js  →  window.MOAD_TESTS["{lectureId}"] = { title, questions:[…] }
                               صح/خطأ: { q, tf:true|false, e }   اختيار: { q, o:[…], c, e }
     maps/{subjectKey}.js   →  window.MOAD_MAPS["{lectureId}"]   (يعرضها mindmap.html)

   الاستعمال:
   - صفحة المادة/المرحلة (script.js): عنصر فاضي <span data-ist="{lectureId}" data-ist-key="{subjectKey}"></span>
     ثم IlmStudy.fill()  → يحمّل بيانات المواد المطلوبة ويرسم الزرارين.
   - صفحة المحاضرة (ilm-nav.js): IlmStudy.mountLecture(lectureId, subjectKey)
     → يضيف الزرارين داخل شريط التنقّل أعلى المحاضرة وأسفلها.

   النتيجة تُحفظ في localStorage بمفتاح ilm_test_{lectureId} (JSON)، فتتزامن مع الحساب
   عبر firebase-sync-manhaj.js مثل علامات الإتمام.
   ========================================================= */
(function () {
  'use strict';
  if (window.IlmStudy) return;

  var me = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var ROOT = new URL('.', me.src).href;          // جذر المستودع (مكان هذا الملف)
  var loaded = {}, waiting = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function addScript(src, done) { var s = document.createElement('script'); s.src = src; s.onload = done; s.onerror = done; document.head.appendChild(s); }

  /* ---------- تحميل بيانات مادة ---------- */
  function load(key, cb) {
    if (!key) { cb && cb(); return; }
    if (loaded[key]) { cb && cb(); return; }
    if (waiting[key]) { waiting[key].push(cb); return; }
    waiting[key] = [cb];
    var left = 2, fin = function () { if (--left) return; loaded[key] = true; var l = waiting[key]; delete waiting[key]; l.forEach(function (f) { f && f(); }); };
    addScript(ROOT + 'tests/' + key + '.js', fin);
    addScript(ROOT + 'maps/' + key + '.js', fin);
  }

  /* ---------- النتيجة المحفوظة ---------- */
  function getScore(id) { try { return JSON.parse(localStorage.getItem('ilm_test_' + id)) || null; } catch (e) { return null; } }
  function saveScore(id, score, n) {
    var old = getScore(id) || {};
    var rec = { best: Math.max(old.best || 0, score), last: score, n: n, tries: (old.tries || 0) + 1, at: new Date().toISOString().slice(0, 10) };
    try {
      localStorage.setItem('ilm_test_' + id, JSON.stringify(rec));
      localStorage.setItem('ilm_sync_ts', String(Date.now()));
    } catch (e) {}
    return rec;
  }

  /* ---------- الزرارين ---------- */
  function buttonsHtml(id, big) {
    var T = window.MOAD_TESTS && window.MOAD_TESTS[id], M = window.MOAD_MAPS && window.MOAD_MAPS[id];
    if (!T && !M) return '';
    var sc = T && getScore(id);
    var cls = big ? 'ist-btn ist-big' : 'ist-btn';
    return (M ? '<a class="' + cls + ' ist-map" href="' + esc(ROOT + 'mindmap.html?id=' + encodeURIComponent(id)) + '" title="الخريطة الذهنية بملء الشاشة"><b>🧠 خريطة</b><small>ذهنية</small></a>' : '') +
      (T ? '<button type="button" class="' + cls + ' ist-test' + (sc ? (sc.best === sc.n ? ' full' : ' tried') : '') + '" data-ist-test="' + esc(id) + '" title="اختبار ' + T.questions.length + ' سؤال">' +
        '<b>📝 اختبار</b><small>' + (sc ? 'أفضل ' + sc.best + '/' + sc.n : T.questions.length + ' سؤال') + '</small></button>' : '');
  }

  function fill(root) {
    var els = (root || document).querySelectorAll('[data-ist]');
    var keys = {};
    els.forEach(function (el) { keys[el.getAttribute('data-ist-key')] = 1; });
    Object.keys(keys).forEach(function (k) {
      load(k, function () {
        (root || document).querySelectorAll('[data-ist][data-ist-key="' + k + '"]').forEach(function (el) {
          var h = buttonsHtml(el.getAttribute('data-ist'));
          el.innerHTML = h;
          el.classList.toggle('ist-has', !!h);
        });
      });
    });
  }

  function mountLecture(id, key) {
    load(key, function () {
      var bars = document.querySelectorAll('.ilm-nav-bar');
      if (!bars.length || !buttonsHtml(id, true)) return;
      bars.forEach(function (bar) {
        var row = bar.querySelector('.ist-row');
        if (!row) { row = document.createElement('div'); row.className = 'ist-row'; bar.insertBefore(row, bar.firstChild); }
        row.setAttribute('data-ist', id); row.setAttribute('data-ist-key', key);
        row.innerHTML = buttonsHtml(id, true);
      });
    });
  }

  /* ---------- نافذة الاختبار ---------- */
  var TQ = null;
  function openTest(id) {
    var T = window.MOAD_TESTS && window.MOAD_TESTS[id]; if (!T) return;
    var tf = T.questions.filter(function (q) { return typeof q.tf === 'boolean'; });
    var mc = T.questions.filter(function (q) { return q.o; });
    TQ = { id: id, T: T, i: 0, score: 0, answered: false, wrong: [],
      qs: shuffle(tf).map(function (q) {
        return { kind: 'tf', q: q.q, e: q.e, opts: [{ t: '✓ صح', ok: q.tf === true }, { t: '✗ خطأ', ok: q.tf === false }] };
      }).concat(shuffle(mc).map(function (q) {
        return { kind: 'mc', q: q.q, e: q.e, opts: shuffle(q.o.map(function (o, k) { return { t: o, ok: k === q.c }; })) };
      })) };
    var m = document.getElementById('ist-modal');
    if (!m) { m = document.createElement('div'); m.id = 'ist-modal'; m.className = 'ist-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); }
    m.hidden = false; document.documentElement.classList.add('ist-open');
    draw();
  }
  function closeTest() { var m = document.getElementById('ist-modal'); if (m) m.hidden = true; document.documentElement.classList.remove('ist-open'); TQ = null; }
  function draw() {
    var m = document.getElementById('ist-modal'); if (!m || !TQ) return;
    var n = TQ.qs.length, html;
    var head = '<div class="ist-head"><div><b>📝 ' + esc(TQ.T.title) + '</b>' +
      '<small>أسئلة من إعداد الذكاء الاصطناعي على ملخص المحاضرة، وقد تحتوي أخطاء؛ راجع الشرح عند أي شك.</small></div>' +
      '<button type="button" class="ist-x" data-ist-act="close" aria-label="اقفل">✕</button></div>';
    if (TQ.i >= n) {
      var pct = Math.round(TQ.score / n * 100), sc = getScore(TQ.id);
      var msg = pct === 100 ? 'ممتاز! الدرجة النهائية 🎉' : pct >= 85 ? 'جميل جدًا، فاضل لمسات بسيطة 👏' : pct >= 60 ? 'كويس، راجع الأسئلة اللي غلطت فيها وحاول تاني 💪' : 'ارجع للملخص وأعد المحاولة — ولا يهمك 🌱';
      var tfN = TQ.qs.filter(function (q) { return q.kind === 'tf'; }).length, mcN = n - tfN;
      var tfW = TQ.wrong.filter(function (w) { return w.kind === 'tf'; }).length, mcW = TQ.wrong.length - tfW;
      html = head + '<div class="ist-body"><div class="ist-score"><strong>' + TQ.score + '</strong><span>من ' + n + '</span><em>' + pct + '%</em></div>' +
        '<div class="ist-bar"><span style="width:' + pct + '%"></span></div>' +
        (tfN && mcN ? '<p class="ist-split"><span class="ist-kind tf">صح ولا خطأ: ' + (tfN - tfW) + '/' + tfN + '</span><span class="ist-kind mc">اختر: ' + (mcN - mcW) + '/' + mcN + '</span></p>' : '') +
        '<p class="ist-msg">' + msg + '</p>' +
        (sc ? '<p class="ist-note">أفضل نتيجة ليك: ' + sc.best + '/' + sc.n + ' — عدد المحاولات: ' + sc.tries + '</p>' : '') +
        (TQ.wrong.length ? '<h4>راجع دول:</h4><ol class="ist-wrong">' + TQ.wrong.map(function (w) {
          return '<li><b>' + esc(w.q) + '</b><span>✓ ' + (w.kind === 'tf' ? 'العبارة ' + esc(w.ok) : esc(w.ok)) + '</span><small>' + esc(w.e) + '</small></li>';
        }).join('') + '</ol>' : '') +
        '<div class="ist-acts"><button type="button" class="ist-go" data-ist-act="again">أعد الاختبار</button><button type="button" class="ist-ghost" data-ist-act="close">اقفل</button></div></div>';
    } else {
      var q = TQ.qs[TQ.i];
      html = head + '<div class="ist-prog"><span>سؤال ' + (TQ.i + 1) + ' من ' + n + ' <em class="ist-kind ' + q.kind + '">' + (q.kind === 'tf' ? 'صح ولا خطأ؟' : 'اختر الإجابة الصحيحة') + '</em></span><span>✓ ' + TQ.score + '</span></div>' +
        '<div class="ist-bar"><span style="width:' + (TQ.i / n * 100) + '%"></span></div>' +
        '<div class="ist-body"><p class="ist-q">' + esc(q.q) + '</p><div class="ist-opts' + (q.kind === 'tf' ? ' tf' : '') + '">' + q.opts.map(function (o, k) {
          return '<button type="button" class="ist-op" data-op="' + k + '">' + esc(o.t) + '</button>';
        }).join('') + '</div><div class="ist-fb" hidden></div>' +
        '<div class="ist-acts"><button type="button" class="ist-go" data-ist-act="next" hidden>' + (TQ.i + 1 < n ? 'السؤال التالي ←' : 'شوف النتيجة') + '</button></div></div>';
    }
    m.innerHTML = '<div class="ist-box">' + html + '</div>';
    var f = m.querySelector('.ist-op') || m.querySelector('[data-ist-act]'); if (f) f.focus();
  }
  function answer(k) {
    if (!TQ || TQ.answered) return;
    var q = TQ.qs[TQ.i], right = q.opts[k].ok, m = document.getElementById('ist-modal');
    TQ.answered = true;
    if (right) TQ.score++;
    else TQ.wrong.push({ q: q.q, ok: q.opts.filter(function (o) { return o.ok; })[0].t.replace(/^[✓✗] /, ''), e: q.e, kind: q.kind });
    m.querySelectorAll('.ist-op').forEach(function (b, j) { b.disabled = true; if (q.opts[j].ok) b.classList.add('ok'); else if (j === k) b.classList.add('no'); });
    var fb = m.querySelector('.ist-fb'); fb.hidden = false; fb.className = 'ist-fb ' + (right ? 'ok' : 'no');
    fb.innerHTML = '<b>' + (right ? '✓ أحسنت' : '✗ مش دي') + '</b> ' + esc(q.e);
    var nx = m.querySelector('[data-ist-act="next"]'); nx.hidden = false; nx.focus();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ist-test]');
    if (t) { e.preventDefault(); openTest(t.getAttribute('data-ist-test')); return; }
    var m = document.getElementById('ist-modal'); if (!m || m.hidden || !TQ) return;
    if (e.target === m) { closeTest(); return; }
    var op = e.target.closest('.ist-op'); if (op) { answer(+op.getAttribute('data-op')); return; }
    var a = e.target.closest('[data-ist-act]'); if (!a) return;
    var act = a.getAttribute('data-ist-act');
    if (act === 'close') closeTest();
    else if (act === 'again') openTest(TQ.id);
    else if (act === 'next') {
      TQ.i++; TQ.answered = false;
      if (TQ.i >= TQ.qs.length) { saveScore(TQ.id, TQ.score, TQ.qs.length); fill(); var bar = document.querySelector('.ist-row'); if (bar) mountLecture(TQ.id, bar.getAttribute('data-ist-key')); }
      draw();
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && TQ) closeTest(); });

  /* ---------- الأنماط ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '[data-ist].ist-has{display:inline-flex;gap:6px;align-items:stretch;flex-wrap:wrap}',
    '.ist-btn{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:74px;padding:4px 9px;border:1px solid #D3D9D2;border-radius:10px;background:#fff;color:#14211D;font:inherit;cursor:pointer;text-decoration:none;line-height:1.4}',
    '.ist-btn b{font-size:13px;white-space:nowrap}.ist-btn small{font-size:11px;color:#77837D;white-space:nowrap}',
    '.ist-btn:hover{border-color:#10493C}',
    '.ist-test.tried{background:#FBF4E6;border-color:#e6cf9f}.ist-test.full{background:#EFF4F1;border-color:#b9d3c6}.ist-test.full small{color:#10493C;font-weight:700}',
    '.ist-row{display:flex;gap:8px;margin:0 0 12px;flex-wrap:wrap}',
    '.ist-big{flex:1;flex-direction:row;gap:10px;padding:10px 14px;border-radius:12px;font-size:14px}.ist-big b{font-size:14.5px}.ist-big small{font-size:12px}',
    'html.ist-open{overflow:hidden}',
    '.ist-modal{position:fixed;inset:0;z-index:9999;background:rgba(15,28,24,.55);display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow-y:auto;direction:rtl;font-family:"Tajawal","Cairo","Segoe UI",Tahoma,sans-serif}',
    '.ist-modal[hidden]{display:none}',
    '.ist-box{width:100%;max-width:640px;background:#FAFAF8;border-radius:18px;padding:16px 18px 18px;box-shadow:0 20px 50px rgba(0,0,0,.25);color:#14211D}',
    '.ist-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}.ist-head>div{flex:1;display:flex;flex-direction:column;gap:2px}',
    '.ist-head b{font-size:17px}.ist-head small{color:#77837D;font-size:12.5px}',
    '.ist-x{border:0;background:transparent;font-size:20px;cursor:pointer;color:#77837D;padding:2px 6px}',
    '.ist-prog{display:flex;justify-content:space-between;font-size:13.5px;font-weight:700;color:#3A4843;margin-bottom:6px}',
    '.ist-bar{height:8px;border-radius:99px;background:#E6E9E4;overflow:hidden}.ist-bar span{display:block;height:100%;background:#AE7C24;border-radius:99px;transition:width .3s}',
    '.ist-body{margin-top:14px}',
    '.ist-q{font-size:19px;font-weight:800;line-height:1.8;margin:0 0 12px}',
    '.ist-opts{display:flex;flex-direction:column;gap:8px}.ist-opts.tf{flex-direction:row}',
    '.ist-op{text-align:right;font:inherit;font-size:16.5px;line-height:1.7;padding:9px 14px;border:1px solid #D3D9D2;border-radius:12px;background:#fff;color:#14211D;cursor:pointer;min-height:44px}',
    '.ist-opts.tf .ist-op{flex:1;text-align:center;font-size:18px;font-weight:800;padding:12px}',
    '.ist-op:hover:not(:disabled){border-color:#AE7C24}.ist-op:disabled{cursor:default}',
    '.ist-op.ok{background:#e7f5ec;border-color:#2f8a5b;color:#1d5c3f;font-weight:700}.ist-op.no{background:#fbeceb;border-color:#b23b2e;color:#8e2b24}',
    '.ist-fb{margin-top:12px;padding:10px 14px;border-radius:12px;font-size:15.5px;line-height:1.8}.ist-fb.ok{background:#eef8f2;color:#1d5c3f}.ist-fb.no{background:#fdf1ef;color:#7b2a23}',
    '.ist-acts{display:flex;gap:8px;margin-top:14px}',
    '.ist-go,.ist-ghost{font:inherit;font-size:15px;font-weight:800;border-radius:10px;padding:8px 16px;cursor:pointer}',
    '.ist-go{background:#10493C;color:#fff;border:0}.ist-go[hidden]{display:none}.ist-ghost{background:#fff;color:#14211D;border:1px solid #D3D9D2}',
    '.ist-kind{font-style:normal;font-size:12px;font-weight:800;border-radius:999px;padding:1px 9px;margin-inline-start:6px}',
    '.ist-kind.tf{background:#e8eefb;color:#2c4f8f}.ist-kind.mc{background:#FBF4E6;color:#8C6119}',
    '.ist-score{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}.ist-score strong{font-size:44px;line-height:1}.ist-score span{color:#77837D;font-weight:700}.ist-score em{margin-inline-start:auto;font-style:normal;font-weight:800;font-size:22px;color:#AE7C24}',
    '.ist-split{display:flex;gap:6px;margin:10px 0 0}.ist-split .ist-kind{margin:0;font-size:13px;padding:3px 12px}',
    '.ist-msg{font-weight:700;color:#3A4843}.ist-note{font-size:13px;color:#77837D}',
    '.ist-body h4{margin:14px 0 6px}',
    '.ist-wrong{margin:0;padding-inline-start:20px;display:flex;flex-direction:column;gap:8px}',
    '.ist-wrong li{background:#fff;border:1px solid #E6E9E4;border-radius:10px;padding:8px 12px}',
    '.ist-wrong b{display:block}.ist-wrong span{display:block;color:#2f8a5b;font-weight:700;margin-top:2px}.ist-wrong small{display:block;color:#77837D;margin-top:2px;line-height:1.7}',
    '@media (max-width:480px){.ist-modal{padding:10px 6px}.ist-box{padding:14px 12px;border-radius:14px}.ist-q{font-size:17.5px}}',
    /* صفحات المحاضرات لها تنسيق خاص لروابط شريط التنقّل؛ فالزرارين يثبّتان شكلهما */
    '.ilm-nav-bar .ist-btn,.ilm-nav-bar .ist-btn:hover{background:#fff!important;color:#14211D!important;border:1px solid #D3D9D2!important;border-radius:12px!important;text-decoration:none!important;box-shadow:none!important;transform:none!important}',
    '.ilm-nav-bar .ist-btn b{color:#14211D!important}.ilm-nav-bar .ist-btn small{color:#77837D!important}',
    '.ilm-nav-bar .ist-test.tried{background:#FBF4E6!important}.ilm-nav-bar .ist-test.full{background:#EFF4F1!important}',
    '@media print{.ist-row,[data-ist]{display:none}}'
  ].join('\n');
  document.head.appendChild(css);

  window.IlmStudy = { load: load, fill: fill, mountLecture: mountLecture, buttonsHtml: buttonsHtml, open: openTest, ROOT: ROOT };
})();
