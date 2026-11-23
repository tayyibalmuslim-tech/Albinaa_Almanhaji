/* =========================================================
   محرّك اختبارات المرحلة — البناء المنهجي
   يقرأ window.EXAM_DATA (من exams/data/NN.js) ويبني الاختبار كاملًا.
   - صح/خطأ واختيار من متعدد: تُصحَّح آليًّا عند الضغط على «تصحيح الاختبار».
   - المقالي: يكتب الطالب إجابته، ثم يُظهر الإجابة النموذجية ويضع لنفسه ✓ أو ✗.
   - الحالة محفوظة في localStorage (مفتاح مستقل لا يدخل في مزامنة الإنجاز).
   ========================================================= */
(function () {
  'use strict';

  var D = window.EXAM_DATA;
  var root = document.getElementById('exam-root');
  if (!D || !root) return;

  var EXAM_NO = document.body.dataset.exam || String(D.id).padStart(2, '0');
  var DAY_ID = document.body.dataset.dayId || '';
  var KEY = 'manhaj_exam_stage1_' + EXAM_NO;
  var ORD = ['الأول', 'الثاني', 'الثالث', 'الرابع'];

  var SUBJECTS = {
    fiqh: 'مدخل إلى علم الفقه',
    hadith: 'مدخل إلى علم الحديث',
    nahw: 'مدخل إلى علم النحو',
    qs: 'مدخل إلى علوم القرآن',
    aqeedah: 'مدخل إلى علم العقيدة',
    sharaya: 'العلوم الشرعية بين الوسائل والمقاصد',
    riyad: 'شرح رياض الصالحين',
    anwar: 'أنوار الأنبياء',
    raqaeq: 'رقائق القرآن',
    mu: 'معالجة القرآن لنفوس المصلحين'
  };
  var LVL = { 1: 'متوسط', 2: 'صعب', 3: 'صعب جدًا' };
  var SEC = {
    tf: { title: 'صح أو خطأ', hint: 'اختر «صح» أو «خطأ»' },
    mcq: { title: 'اختر الإجابة الصحيحة', hint: 'إجابة واحدة صحيحة من أربع' },
    essay: { title: 'أسئلة مقالية', hint: 'اكتب إجابتك، ثم قارنها بالنموذج وقيّم نفسك' }
  };
  var LETTERS = ['أ', 'ب', 'ج', 'د'];

  var Q = D.questions;
  var TOTAL = Q.length;

  /* ---------- الحالة ---------- */
  function blank() { return { ans: {}, txt: {}, mark: {}, show: {}, done: false }; }
  var S = load();
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (v && v.ans) { v.txt = v.txt || {}; v.mark = v.mark || {}; v.show = v.show || {}; return v; }
    } catch (e) {}
    return blank();
  }
  function save() {
    S.ts = Date.now();
    if (S.done) { S.score = stats().right; S.total = TOTAL; } else { delete S.score; }
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

  /* ---------- أدوات ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  // خلط ثابت لترتيب الخيارات (نفس الترتيب في كل مرة لنفس السؤال)
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var PERM = Q.map(function (q, i) {
    if (q.t !== 'mcq') return null;
    var r = rng(Number(EXAM_NO) * 7919 + i * 104729 + 17), a = [0, 1, 2, 3];
    for (var k = a.length - 1; k > 0; k--) { var j = Math.floor(r() * (k + 1)); var t = a[k]; a[k] = a[j]; a[j] = t; }
    return a;
  });
  function correctOf(q) { return q.t === 'tf' ? q.a : 0; }
  function isObjective(q) { return q.t === 'tf' || q.t === 'mcq'; }
  function answered(i) {
    var q = Q[i];
    if (isObjective(q)) return S.ans[i] !== undefined;
    return !!(S.txt[i] && S.txt[i].trim());
  }
  // نتيجة سؤال: true صح، false خطأ، null لم يُجب/لم يُقيَّم
  function outcome(i) {
    var q = Q[i];
    if (isObjective(q)) return S.ans[i] === undefined ? null : S.ans[i] === correctOf(q);
    return S.mark[i] === undefined ? null : !!S.mark[i];
  }

  /* ---------- بناء البطاقات ---------- */
  function badges(q, n) {
    return '<div class="q-top"><span class="q-num">' + n + '</span>' +
      '<span class="lvl lvl-' + q.d + '">' + LVL[q.d] + '</span>' +
      '<span class="subj">' + esc(SUBJECTS[q.s] || q.s) + '</span>' +
      (S.done ? verdictHtml(Q.indexOf(q)) : '') + '</div>';
  }
  function verdictHtml(i) {
    var o = outcome(i), q = Q[i];
    if (o === true) return '<span class="verdict ok">✓ صحيحة</span>';
    if (o === false) return '<span class="verdict bad">✗ خاطئة</span>';
    return '<span class="verdict skip">' + (isObjective(q) ? 'لم تُجب' : 'بانتظار تقييمك') + '</span>';
  }
  function resClass(i) {
    if (!S.done) return '';
    var o = outcome(i);
    return o === true ? ' res-ok' : o === false ? ' res-bad' : ' res-skip';
  }
  function reviewLink(q) {
    return q.r ? '<br><a class="review" href="../' + esc(q.r) + '">← راجع المحاضرة: ' + esc(SUBJECTS[q.s] || '') + '</a>' : '';
  }

  function cardHtml(i, n) {
    var q = Q[i], h = '';
    h += '<article class="q' + resClass(i) + (S.done && isObjective(q) ? ' graded' : '') + '" id="q-' + i + '" data-i="' + i + '" data-n="' + n + '">';
    h += badges(q, n);
    h += '<div class="q-text">' + esc(q.q) + '</div>';

    if (q.t === 'tf') {
      h += '<div class="opts tf">';
      [true, false].forEach(function (v) {
        var cls = 'opt';
        if (S.ans[i] === v) cls += ' sel';
        if (S.done) {
          if (v === q.a) cls += ' is-right';
          else if (S.ans[i] === v) cls += ' is-wrong';
        }
        h += '<button type="button" class="' + cls + '" data-act="ans" data-v="' + v + '"' + (S.done ? ' disabled' : '') + '>' + (v ? 'صح ✓' : 'خطأ ✗') + '</button>';
      });
      h += '</div>';
    } else if (q.t === 'mcq') {
      h += '<div class="opts">';
      PERM[i].forEach(function (orig, pos) {
        var cls = 'opt';
        if (S.ans[i] === orig) cls += ' sel';
        if (S.done) {
          if (orig === 0) cls += ' is-right';
          else if (S.ans[i] === orig) cls += ' is-wrong';
        }
        h += '<button type="button" class="' + cls + '" data-act="ans" data-v="' + orig + '"' + (S.done ? ' disabled' : '') + '>' +
          '<span class="ltr">' + LETTERS[pos] + '</span><span>' + esc(q.o[orig]) + '</span></button>';
      });
      h += '</div>';
    } else {
      h += '<textarea class="essay-box" data-act="txt" placeholder="اكتب إجابتك هنا…">' + esc(S.txt[i] || '') + '</textarea>';
      var shown = S.show[i] || S.done;
      if (!S.done) {
        h += '<div class="essay-actions"><button type="button" class="btn btn-sm btn-outline" data-act="show">' +
          (shown ? 'إخفاء الإجابة النموذجية' : 'إظهار الإجابة النموذجية') + '</button></div>';
      }
      if (shown) {
        h += '<div class="model"><div class="model-title">الإجابة النموذجية (العناصر الأساسية)</div>' + nl(q.m) + reviewLink(q) + '</div>';
        h += '<div class="self-mark"><span class="lbl">بعد المقارنة، إجابتك:</span>' +
          '<button type="button" class="mark-btn ok' + (S.mark[i] === true ? ' on' : '') + '" data-act="mark" data-v="1"><span class="ic">✓</span> صحيحة</button>' +
          '<button type="button" class="mark-btn bad' + (S.mark[i] === false ? ' on' : '') + '" data-act="mark" data-v="0"><span class="ic">✗</span> خاطئة</button>' +
          '</div>';
      }
    }

    if (S.done && isObjective(q)) {
      var right = q.t === 'tf' ? (q.a ? 'صح' : 'خطأ') : LETTERS[PERM[i].indexOf(0)];
      h += '<div class="explain"><b>الإجابة الصحيحة: ' + right + '.</b> ' + esc(q.ex || '') + reviewLink(q) + '</div>';
    }
    h += '</article>';
    return h;
  }

  /* ---------- النتيجة ---------- */
  function stats() {
    var r = { right: 0, wrong: 0, pending: 0, sec: {}, lvl: {}, subj: {} };
    function bump(map, k, ok) { map[k] = map[k] || { r: 0, t: 0 }; map[k].t++; if (ok) map[k].r++; }
    Q.forEach(function (q, i) {
      var o = outcome(i);
      if (o === true) r.right++; else if (o === false) r.wrong++; else r.pending++;
      bump(r.sec, q.t, o === true); bump(r.lvl, q.d, o === true); bump(r.subj, q.s, o === true);
    });
    r.essayPending = Q.filter(function (q, i) { return q.t === 'essay' && S.mark[i] === undefined; }).length;
    return r;
  }
  function gradeLabel(p) {
    if (p >= 90) return 'ممتاز — ما شاء الله، ثبّت ذلك بالمراجعة';
    if (p >= 80) return 'جيد جدًا — بقي القليل للإتقان';
    if (p >= 65) return 'جيد — راجع المواد الأضعف أدناه';
    if (p >= 50) return 'مقبول — تحتاج مراجعة مركّزة قبل الانتقال';
    return 'يحتاج مراجعة — أعد المحاضرات المشار إليها ثم أعد الاختبار';
  }
  function resultHtml() {
    if (!S.done) return '';
    var st = stats(), p = Math.round(st.right / TOTAL * 100);
    var h = '<section class="result" id="ex-result">';
    h += '<div class="result-top"><div class="score-ring" style="--p:' + p + '"><div><span><b>' + st.right + '/' + TOTAL + '</b><small>' + p + '%</small></span></div></div>';
    h += '<div class="result-txt"><h2>' + gradeLabel(p) + '</h2>';
    h += '<p>صحيحة: <b>' + st.right + '</b> · خاطئة: <b>' + st.wrong + '</b> · بلا إجابة/تقييم: <b>' + st.pending + '</b></p>';
    if (st.essayPending) h += '<p class="pending">قيّم ' + st.essayPending + ' سؤالًا مقاليًّا بـ ✓ أو ✗ لتكتمل نتيجتك.</p>';
    h += '</div></div>';

    h += '<div class="res-grid">';
    h += '<div class="res-card"><h3>حسب نوع السؤال</h3>';
    ['tf', 'mcq', 'essay'].forEach(function (t) { var x = st.sec[t]; if (x) h += row(SEC[t].title, x); });
    h += '</div><div class="res-card"><h3>حسب مستوى الصعوبة</h3>';
    [1, 2, 3].forEach(function (d) { var x = st.lvl[d]; if (x) h += row(LVL[d], x); });
    h += '</div><div class="res-card"><h3>حسب المادة</h3>';
    Object.keys(SUBJECTS).forEach(function (k) { var x = st.subj[k]; if (x) h += row(SUBJECTS[k], x, true); });
    h += '</div></div>';

    h += '<div class="res-actions"><button type="button" class="btn btn-sm btn-outline" data-act="filter">' +
      (root.classList.contains('filter-on') ? 'عرض كل الأسئلة' : 'عرض الأخطاء وغير المُجاب فقط') + '</button>' +
      '<button type="button" class="btn btn-sm btn-outline" data-act="reset">إعادة الاختبار من جديد</button></div>';
    h += '</section>';
    return h;

    function row(label, x, flag) {
      var weak = flag && x.r / x.t < 0.6;
      return '<div class="res-row' + (weak ? ' weak' : '') + '"><span>' + esc(label) + (weak ? ' ⚠' : '') + '</span><b>' + x.r + '/' + x.t + '</b></div>';
    }
  }

  /* ---------- الصفحة كاملة ---------- */
  function counts() {
    var c = { tf: 0, mcq: 0, essay: 0 };
    Q.forEach(function (q) { c[q.t]++; });
    return c;
  }
  function render() {
    var c = counts(), n = 0, h = '';
    h += '<header class="ex-head">';
    h += '<div class="eyebrow">المرحلة الأولى · الاختبار ' + Number(EXAM_NO) + ' من 4</div>';
    h += '<h1>' + esc(D.title) + '</h1>';
    h += '<p class="ex-sub">اختبار شامل على مواد المرحلة الأولى كلها — ' + TOTAL + ' سؤالًا</p>';
    h += '<div class="ex-meta">' +
      '<span class="ex-chip">صح/خطأ <b>' + c.tf + '</b></span>' +
      '<span class="ex-chip">اختيار <b>' + c.mcq + '</b></span>' +
      '<span class="ex-chip">مقالي <b>' + c.essay + '</b></span>' +
      '<span class="ex-chip"><span class="lvl lvl-1">متوسط 50%</span></span>' +
      '<span class="ex-chip"><span class="lvl lvl-2">صعب 30%</span></span>' +
      '<span class="ex-chip"><span class="lvl lvl-3">صعب جدًا 20%</span></span></div>';
    if (DAY_ID) h += '<label class="checkbox-line"><input type="checkbox" id="ex-day"> <span>إتمام يوم الاختبار (يُعلَّم تلقائيًّا عند التصحيح)</span></label>';
    h += '</header>';

    h += '<div class="ex-notice"><strong>تنبيه:</strong> هذه الأسئلة وإجاباتها النموذجية أُعدّت بمساعدة الذكاء الاصطناعي اعتمادًا على ملخصات محاضرات المرحلة، وقد تحتوي على أخطاء؛ فراجعها على المحاضرات نفسها، وما خالف كلام الشيخ فالعبرة بكلام الشيخ.</div>';

    h += '<div class="ex-howto"><ul>' +
      '<li>أجب عن أسئلة صح/خطأ والاختيار، ثم اضغط <b>«تصحيح الاختبار»</b> لترى نتيجتك وتعليل كل إجابة.</li>' +
      '<li>في المقالي: اكتب إجابتك أولًا، ثم أظهر الإجابة النموذجية وقيّم نفسك بـ <b>✓ صحيحة</b> أو <b>✗ خاطئة</b>.</li>' +
      '<li>إجاباتك محفوظة على هذا الجهاز تلقائيًّا، ويمكنك الرجوع إليها لاحقًا.</li></ul></div>';

    h += '<div class="ex-bar"><div class="ex-bar-prog"><div class="ex-bar-label"><span>المُجاب</span><b id="ex-count"></b></div>' +
      '<div class="ex-track"><div class="ex-fill" id="ex-fill"></div></div></div>' +
      (S.done
        ? '<a class="btn btn-sm" href="#ex-result">نتيجتك</a>'
        : '<button type="button" class="btn btn-sm" data-act="submit">تصحيح الاختبار</button>') +
      '</div>';
    h += '<div id="ex-warn"></div>';

    h += '<div id="ex-result-wrap">' + resultHtml() + '</div>';

    ['tf', 'mcq', 'essay'].forEach(function (t) {
      h += '<section class="ex-section"><div class="ex-section-head"><h2>' + SEC[t].title + '</h2><span>' + SEC[t].hint + ' · ' + c[t] + ' سؤالًا</span></div>';
      Q.forEach(function (q, i) { if (q.t === t) { n++; h += cardHtml(i, n); } });
      h += '</section>';
    });

    h += '<div class="ex-foot">' +
      (S.done ? '' : '<button type="button" class="btn" data-act="submit">تصحيح الاختبار</button>') +
      '<a class="btn btn-outline" href="index.html">كل اختبارات المرحلة</a>' +
      '<a class="btn btn-outline" href="../index.html">الرجوع إلى المرحلة</a></div>';

    root.innerHTML = h;
    syncDay();
    updateBar();
  }

  function rerenderCard(i) {
    var el = document.getElementById('q-' + i);
    if (!el) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = cardHtml(i, el.dataset.n);
    el.replaceWith(tmp.firstChild);
  }
  function rerenderResult() {
    var w = document.getElementById('ex-result-wrap');
    if (w) w.innerHTML = resultHtml();
  }
  function updateBar() {
    var a = 0;
    for (var i = 0; i < TOTAL; i++) if (answered(i)) a++;
    var c = document.getElementById('ex-count'), f = document.getElementById('ex-fill');
    if (c) c.textContent = a + ' / ' + TOTAL;
    if (f) f.style.width = (a / TOTAL * 100) + '%';
  }

  /* ---------- يوم الاختبار في جدول المرحلة ---------- */
  function dayDone() {
    if (typeof isDone === 'function') return isDone(DAY_ID);
    return localStorage.getItem('ilm_' + DAY_ID) === '1';
  }
  function setDay(v) {
    if (!DAY_ID) return;
    if (typeof setDone === 'function') setDone(DAY_ID, v);
    else localStorage.setItem('ilm_' + DAY_ID, v ? '1' : '0');
  }
  function syncDay() {
    var cb = document.getElementById('ex-day');
    if (!cb) return;
    cb.checked = dayDone();
    cb.onchange = function () { setDay(cb.checked); };
  }

  /* ---------- تأكيد بضغطتين (بدون نوافذ منبثقة) ---------- */
  var armed = null;
  function arm(kind, msg) {
    if (armed === kind) { armed = null; warn(''); return true; }
    armed = kind; warn(msg);
    return false;
  }
  function warn(msg) {
    var w = document.getElementById('ex-warn');
    if (w) w.innerHTML = msg ? '<div class="ex-notice">' + msg + '</div>' : '';
  }

  /* ---------- الأحداث ---------- */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'TEXTAREA') return;
    var act = b.dataset.act, card = b.closest('.q'), i = card ? Number(card.dataset.i) : -1;

    if (act === 'ans' && !S.done) {
      var q = Q[i];
      S.ans[i] = q.t === 'tf' ? b.dataset.v === 'true' : Number(b.dataset.v);
      save(); rerenderCard(i); updateBar();
    } else if (act === 'show') {
      S.show[i] = !S.show[i]; save(); rerenderCard(i);
    } else if (act === 'mark') {
      var v = b.dataset.v === '1';
      if (S.mark[i] === v) delete S.mark[i]; else S.mark[i] = v;
      save(); rerenderCard(i); rerenderResult();
    } else if (act === 'submit') {
      var left = Q.filter(function (q, k) { return isObjective(q) && S.ans[k] === undefined; }).length;
      if (left && !arm('submit', 'باقي <b>' + left + '</b> سؤالًا (صح/خطأ أو اختيار) بلا إجابة. اضغط «تصحيح الاختبار» مرة أخرى للتأكيد.')) {
        window.scrollTo({ top: document.querySelector('.ex-bar').offsetTop - 8, behavior: 'smooth' });
        return;
      }
      S.done = true; save();
      if (DAY_ID && !dayDone()) setDay(true);
      render();
      var r = document.getElementById('ex-result');
      if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (act === 'reset') {
      if (!arm('reset', 'سيُمسح كل ما أجبته في هذا الاختبار. اضغط «إعادة الاختبار من جديد» مرة أخرى للتأكيد.')) {
        var w = document.getElementById('ex-warn'); if (w) w.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      S = blank(); save(); root.classList.remove('filter-on'); render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (act === 'filter') {
      root.classList.toggle('filter-on'); rerenderResult();
    }
  });
  root.addEventListener('input', function (e) {
    if (e.target.dataset.act !== 'txt') return;
    var i = Number(e.target.closest('.q').dataset.i);
    S.txt[i] = e.target.value; save(); updateBar();
  });

  render();
  // بعد مزامنة script.js مع السحابة قد تتغير حالة يوم الاختبار
  window.addEventListener('load', function () { setTimeout(syncDay, 1500); });
})();
