/* =========================================================
   ilm-highlight.js  —  الإصدار 2
   نظام هايلايت نصوص + تعليقات + بطاقات مراجعة
   لمحاضرات "منهجي في طلب العلم" ذات المحتوى الفعلي المكتوب

   أهم ما عولج في هذا الإصدار:
   1) التظليل الواحد الذي يعبر وسمًا داخليًا (<strong> مثلًا) كان يُحتسب
      عدة بطاقات — الآن كل تظليل يحمل معرّف مجموعة (data-hl-group) فيُحتسب بطاقة واحدة.
   2) التظليل داخل الصناديق (.key-point / .warning-box ...) لم يكن يُحفظ إطلاقًا
      لأن حاويتها <div> ولم تكن ضمن العناصر المفهرسة — الآن تُفهرس كل حاوية
      تحتوي نصًا مباشرًا (مع الحفاظ على معرّفات العناصر القديمة كما هي).
   3) مفتاح التعليق كان يعتمد على ترتيب الـmark داخل الفقرة، فكان ينزلق إلى
      تظليل آخر عند إضافة تظليل قبله — الآن لكل تظليل معرّف ثابت.

   الإضافة في الصفحة (قرب نهاية body، بعد المحتوى):
   <script src="[المسار]/ilm-highlight.js" data-lecture-id="[معرّف المحاضرة]"></script>
   ويجب أن يحيط عنصر واحد على الأقل بالمحتوى القابل للتحديد بالسمة:
   data-ilm-highlight-zone (مثال: <main data-ilm-highlight-zone> ... </main>)
   ========================================================= */
(function () {
  'use strict';

  var scriptEl = document.currentScript;
  var LECTURE_ID = (scriptEl && scriptEl.dataset.lectureId) || document.body.dataset.lectureId || 'unknown';
  var STORAGE_KEY = 'ilm_hl_' + LECTURE_ID;

  var COLORS = [
    { key: 'hl-yellow', label: 'أصفر', bg: '#fdf0a8' },
    { key: 'hl-green',  label: 'أخضر', bg: '#c9edd3' },
    { key: 'hl-pink',   label: 'وردي', bg: '#f8d2e0' },
    { key: 'hl-blue',   label: 'أزرق', bg: '#c7e2f7' }
  ];
  var COLOR_KEYS = COLORS.map(function (c) { return c.key; });

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------------- الأنماط ---------------- */
  var style = document.createElement('style');
  style.textContent = `
    mark.hl-yellow{ background:#fdf0a8; }
    mark.hl-green{  background:#c9edd3; }
    mark.hl-pink{   background:#f8d2e0; }
    mark.hl-blue{   background:#c7e2f7; }
    mark[class*="hl-"]{
      color:inherit; border-radius:3px; padding:0 2px;
      cursor:pointer; transition:filter .12s;
    }
    mark[class*="hl-"]:hover{ filter:brightness(.955); }
    mark.hl-has-note{ box-shadow:0 2px 0 0 #7c2431 inset; }
    mark.ilm-active{ outline:2px solid rgba(124,36,49,.55); outline-offset:1px; }

    /* ===== شريط الأدوات المنبثق ===== */
    #ilm-hl-menu{
      position:absolute; z-index:9500; display:none;
      background:#0f2b27; border:1px solid rgba(227,195,102,.28);
      border-radius:14px; padding:7px 8px;
      box-shadow:0 14px 34px rgba(15,43,39,.34);
      direction:rtl; gap:5px; align-items:center;
      font-family:'Cairo','Tajawal','Segoe UI',Tahoma,sans-serif;
    }
    #ilm-hl-menu.show{ display:flex; }
    #ilm-hl-menu .ilm-swatch{
      width:30px; height:30px; border:2px solid rgba(255,255,255,.22); border-radius:50%;
      cursor:pointer; padding:0; flex-shrink:0; position:relative;
      transition:transform .12s, border-color .12s;
    }
    #ilm-hl-menu .ilm-swatch:hover{ transform:scale(1.12); border-color:rgba(227,195,102,.85); }
    #ilm-hl-menu .ilm-swatch.is-current::after{
      content:"✓"; position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      font-size:15px; font-weight:700; color:#0f2b27;
    }
    #ilm-hl-menu .ilm-pill{
      height:30px; border-radius:15px; border:none; cursor:pointer;
      background:#f6efdc; color:#0f2b27; font-size:12.5px; font-weight:600;
      font-family:inherit; padding:0 12px; display:flex; align-items:center; gap:5px;
      transition:background .12s;
    }
    #ilm-hl-menu .ilm-pill:hover{ background:#e3c366; }
    #ilm-hl-menu .ilm-danger{
      width:30px; height:30px; border-radius:50%; border:none; cursor:pointer;
      background:#7c2431; color:#fff; font-size:14px;
      display:flex; align-items:center; justify-content:center;
      transition:background .12s;
    }
    #ilm-hl-menu .ilm-danger:hover{ background:#9c2f3e; }
    #ilm-hl-menu .ilm-sep{ width:1px; height:20px; background:rgba(227,195,102,.28); margin:0 2px; }

    /* ===== نافذة التعليق ===== */
    #ilm-note-popover{
      position:absolute; z-index:9600; display:none;
      width:300px; max-width:90vw; background:#f6efdc;
      border:1px solid #e6d6a8; border-radius:14px;
      padding:15px; box-shadow:0 16px 38px rgba(15,43,39,.26); direction:rtl;
      font-family:'Cairo','Tajawal','Segoe UI',Tahoma,sans-serif;
    }
    #ilm-note-popover.show{ display:block; }
    #ilm-note-popover .ilm-note-head{
      font-size:12px; font-weight:700; color:#7d715a;
      margin-bottom:8px; display:flex; align-items:center; gap:6px;
    }
    #ilm-note-popover .ilm-note-quote{
      font-size:12.5px; color:#26200f; background:#fff;
      border-right:3px solid #c8992b; border-radius:7px;
      padding:7px 9px; margin-bottom:9px; max-height:60px; overflow:hidden;
      line-height:1.7;
    }
    #ilm-note-popover textarea{
      width:100%; box-sizing:border-box; min-height:86px; resize:vertical;
      border:1px solid #e6d6a8; border-radius:9px; padding:9px 11px;
      font-family:inherit; font-size:13.5px; color:#26200f; outline:none;
      background:#fff; line-height:1.8;
    }
    #ilm-note-popover textarea:focus{ border-color:#c8992b; box-shadow:0 0 0 3px rgba(200,153,43,.16); }
    #ilm-note-popover .ilm-note-actions{ display:flex; gap:8px; margin-top:9px; }
    #ilm-note-popover button{
      flex:1; padding:9px; border:none; border-radius:9px; cursor:pointer;
      font-family:inherit; font-size:13px; font-weight:700; transition:opacity .12s;
    }
    #ilm-note-popover button:hover{ opacity:.9; }
    #ilm-note-popover .ilm-note-save{ background:#204f43; color:#fff; }
    #ilm-note-popover .ilm-note-cancel{ background:#e6d6a8; color:#26200f; }

    .ilm-hl-note-tip{
      position:absolute; z-index:9550; display:none; max-width:280px;
      background:#0f2b27; color:#f7f1de; font-size:12.5px; line-height:1.75;
      border-radius:9px; padding:10px 13px; direction:rtl;
      font-family:'Cairo','Tajawal',sans-serif; box-shadow:0 8px 22px rgba(15,43,39,.3);
    }
    .ilm-hl-note-tip.show{ display:block; }

    /* ===== لوحة البطاقات ===== */
    .ilm-export-section{
      max-width:980px; margin:44px auto 24px; padding:0;
      background:#f6efdc; border:1px solid #e6d6a8; border-radius:16px;
      font-family:'Cairo','Tajawal','Segoe UI',Tahoma,sans-serif; direction:rtl;
      box-shadow:0 10px 30px rgba(15,43,39,.12); overflow:hidden;
    }
    .ilm-export-head{
      display:flex; align-items:center; justify-content:space-between;
      gap:12px; padding:16px 20px; cursor:pointer;
      background:linear-gradient(180deg,#0f2b27,#153a34); color:#f7f1de;
      flex-wrap:wrap;
    }
    .ilm-export-head h3{
      margin:0; font-family:'Amiri','Cairo',serif; font-size:19px; font-weight:700;
      display:flex; align-items:center; gap:9px; color:#f7f1de;
    }
    .ilm-badge{
      background:#c8992b; color:#0f2b27; font-size:12px; font-weight:700;
      border-radius:20px; padding:2px 11px; font-family:'Cairo',sans-serif;
    }
    .ilm-chevron{ font-size:13px; opacity:.75; transition:transform .2s; }
    .ilm-export-section.is-open .ilm-chevron{ transform:rotate(180deg); }
    .ilm-export-body{ display:none; padding:16px 20px 20px; }
    .ilm-export-section.is-open .ilm-export-body{ display:block; }

    .ilm-export-hint{ font-size:12.5px; color:#7d715a; margin:0 0 14px; line-height:1.8; }
    .ilm-card-list{ display:flex; flex-direction:column; gap:9px; margin-bottom:16px; }
    .ilm-card{
      display:flex; gap:10px; align-items:flex-start;
      background:#fff; border:1px solid #e6d6a8; border-radius:11px; padding:11px 13px;
    }
    .ilm-card-dot{ width:11px; height:11px; border-radius:50%; margin-top:7px; flex-shrink:0; border:1px solid rgba(0,0,0,.12); }
    .ilm-card-main{ flex:1; min-width:0; }
    .ilm-card-q{ font-size:13.5px; color:#26200f; line-height:1.85; }
    .ilm-card-a{
      font-size:12.5px; color:#204f43; margin-top:5px; line-height:1.75;
      padding-right:9px; border-right:2px solid #c8992b;
    }
    .ilm-card-a.is-empty{ color:#a89b80; border-right-color:#e6d6a8; font-style:italic; }
    .ilm-card-tools{ display:flex; gap:5px; flex-shrink:0; }
    .ilm-card-tools button{
      width:29px; height:29px; border-radius:8px; border:1px solid #e6d6a8;
      background:#f6efdc; cursor:pointer; font-size:13px; color:#26200f;
      display:flex; align-items:center; justify-content:center; transition:background .12s;
    }
    .ilm-card-tools button:hover{ background:#e6d6a8; }
    .ilm-card-tools button.ilm-del:hover{ background:#7c2431; color:#fff; border-color:#7c2431; }

    .ilm-empty{
      text-align:center; padding:26px 14px; color:#7d715a; font-size:13.5px; line-height:1.9;
      background:#fff; border:1px dashed #e6d6a8; border-radius:11px; margin-bottom:16px;
    }
    .ilm-export-actions{ display:flex; gap:9px; flex-wrap:wrap; }
    .ilm-export-btn{
      flex:1; min-width:160px; padding:11px 20px; background:#204f43; color:#fff;
      border:none; border-radius:10px; font-family:inherit; font-size:14px; font-weight:700;
      cursor:pointer; transition:background .15s;
    }
    .ilm-export-btn:hover{ background:#163931; }
    .ilm-export-btn.secondary{ background:#e6d6a8; color:#26200f; }
    .ilm-export-btn.secondary:hover{ background:#c8992b; }
    .ilm-export-btn:disabled{ opacity:.45; cursor:not-allowed; }

    @media (max-width:560px){
      .ilm-export-section{ margin:30px 12px 20px; border-radius:14px; }
      #ilm-hl-menu .ilm-swatch{ width:34px; height:34px; }
      #ilm-hl-menu .ilm-pill, #ilm-hl-menu .ilm-danger{ height:34px; }
      #ilm-hl-menu .ilm-danger{ width:34px; }
      .ilm-export-btn{ min-width:100%; }
    }
    @media print{
      #ilm-hl-menu, #ilm-note-popover, .ilm-hl-note-tip, .ilm-export-actions{ display:none !important; }
    }
  `;
  document.head.appendChild(style);

  /* ---------------- عناصر الواجهة ---------------- */
  var menu = document.createElement('div');
  menu.id = 'ilm-hl-menu';
  menu.innerHTML = COLORS.map(function (c) {
    return '<button type="button" class="ilm-swatch" data-color="' + c.key + '" style="background:' + c.bg + '" title="' + c.label + '"></button>';
  }).join('') +
    '<span class="ilm-sep"></span>' +
    '<button type="button" class="ilm-pill" data-action="note">💬 تعليق</button>' +
    '<span class="ilm-sep"></span>' +
    '<button type="button" class="ilm-danger" data-action="remove" title="إزالة التظليل">✕</button>';
  document.body.appendChild(menu);

  var notePopover = document.createElement('div');
  notePopover.id = 'ilm-note-popover';
  notePopover.innerHTML =
    '<div class="ilm-note-head">💬 تعليقك على هذا التظليل</div>' +
    '<div class="ilm-note-quote"></div>' +
    '<textarea placeholder="اكتب الفائدة أو السؤال الذي تريد مراجعته لاحقًا..."></textarea>' +
    '<div class="ilm-note-actions">' +
    '<button type="button" class="ilm-note-save">حفظ</button>' +
    '<button type="button" class="ilm-note-cancel">إلغاء</button>' +
    '</div>';
  document.body.appendChild(notePopover);

  var noteTip = document.createElement('div');
  noteTip.className = 'ilm-hl-note-tip';
  document.body.appendChild(noteTip);

  /* ---------------- منطقة الهايلايت وفهرسة الفقرات ---------------- */
  var zone = document.querySelector('[data-ilm-highlight-zone]') || document.body;
  var SKIP_SELECTOR = '.ilm-export-section, #ilm-hl-menu, #ilm-note-popover';

  var blocks = [];
  (function indexBlocks() {
    /* المرحلة الأولى: نفس عناصر الإصدار السابق وبنفس ترتيب الترقيم،
       حتى تبقى كل التظليلات المحفوظة سابقًا مرتبطة بفقراتها الصحيحة. */
    var BLOCK_TAGS = ['P', 'LI', 'BLOCKQUOTE', 'TD', 'TH', 'DD', 'DT', 'FIGCAPTION'];
    var idx = 0;
    zone.querySelectorAll(BLOCK_TAGS.join(',')).forEach(function (el) {
      if (!el.textContent || !el.textContent.trim()) return;
      if (el.closest(SKIP_SELECTOR)) return;
      if (!el.dataset.ilmBlockId) el.dataset.ilmBlockId = 'b' + (idx++);
      blocks.push(el);
    });

    /* المرحلة الثانية (جديدة): الحاويات التي تحمل نصًا مباشرًا ولم تُفهرس بعد،
       مثل <div> داخل .key-point و .warning-box والعناوين.
       ترقيمها في مساحة مستقلة (x) حتى لا تزحزح معرّفات المرحلة الأولى. */
    var EXTRA_TAGS = ['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'MAIN',
                      'FIGURE', 'SUMMARY', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    function hasDirectText(el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim() !== '') return true;
      }
      return false;
    }
    var extras = [];
    zone.querySelectorAll(EXTRA_TAGS.join(',')).forEach(function (el) {
      if (el.dataset.ilmBlockId) return;
      if (el.closest(SKIP_SELECTOR)) return;
      if (el.querySelector('[data-ilm-block-id]')) return; // يحتوي فقرة مفهرسة أصلًا
      if (!hasDirectText(el)) return;
      extras.push(el);
    });
    var xIdx = 0;
    extras.forEach(function (el) {
      // تجاهل الحاوية التي تحتوي حاوية مرشحة أخرى (نأخذ الأعمق فقط)
      for (var i = 0; i < extras.length; i++) {
        if (extras[i] !== el && el.contains(extras[i])) return;
      }
      el.dataset.ilmBlockId = 'x' + (xIdx++);
      blocks.push(el);
    });

    // ترتيب الفقرات بترتيب ظهورها في الصفحة (لترتيب البطاقات عند التصدير)
    blocks.sort(function (a, b) {
      var pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  })();

  /* ---------------- تخزين محلي + سحابي ---------------- */
  function readLocal() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && typeof raw === 'object') {
        return { blocks: raw.blocks || {}, notes: raw.notes || {}, ts: raw.ts || 0 };
      }
    } catch (e) {}
    return { blocks: {}, notes: {}, ts: 0 };
  }
  function writeLocal(data, ts) {
    try {
      data.ts = ts || Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }
  function pushToCloud(data) {
    if (window.ManhajCloud && window.ManhajCloud.user && window.ManhajCloud.saveHighlights) {
      window.ManhajCloud.saveHighlights(LECTURE_ID, data, data.ts);
    }
  }

  var state = readLocal();

  function persistState() {
    state.ts = Date.now();
    writeLocal(state, state.ts);
    pushToCloud(state);
  }
  function saveBlockHtml(el) {
    state.blocks[el.dataset.ilmBlockId] = el.innerHTML;
  }
  function loadFromState() {
    blocks.forEach(function (el) {
      var saved = state.blocks[el.dataset.ilmBlockId];
      if (saved !== undefined) el.innerHTML = saved;
    });
    migrateLegacyMarks();
    applyNoteIndicators();
    refreshPanel();
  }

  async function syncFromCloudOnce() {
    if (!window.ManhajCloud) { loadFromState(); return; }
    try { await window.ManhajCloud.ready; } catch (e) { loadFromState(); return; }
    var cloud = null;
    try {
      if (window.ManhajCloud.loadHighlights) cloud = await window.ManhajCloud.loadHighlights(LECTURE_ID);
    } catch (e) { cloud = null; }

    if (cloud && (cloud.ts || 0) > (state.ts || 0)) {
      state = { blocks: cloud.blocks || {}, notes: cloud.notes || {}, ts: cloud.ts || 0 };
      writeLocal(state, state.ts);
    } else if (state.ts > 0) {
      pushToCloud(state);
    }
    loadFromState();
  }

  /* ---------------- هوية التظليل ---------------- */
  function ownerBlockOf(node) {
    var el = node && node.nodeType === 3 ? node.parentElement : node;
    return el && el.closest ? el.closest('[data-ilm-block-id]') : null;
  }
  // مفتاح التعليق = معرّف المجموعة (التظليل الواحد ولو تجزّأ لعدة mark)
  function noteKeyOf(markEl) {
    return markEl.dataset.hlGroup || markEl.dataset.hlId || '';
  }
  // هل لا يوجد نص فعلي بين تظليلين؟ (يعمل حتى لو كانا في مستويات تعشيش مختلفة)
  function noTextBetween(a, b) {
    try {
      var r = document.createRange();
      r.setStartAfter(a);
      r.setEndBefore(b);
      return r.toString().trim() === '';
    } catch (e) { return false; }
  }
  function sameHighlight(a, b) {
    var ga = a.dataset.hlGroup, gb = b.dataset.hlGroup;
    if (ga && gb) return ga === gb;
    if (!ga && !gb) return noTextBetween(a, b);
    return false;
  }
  // يجمع عناصر mark الخاصة بفقرة في مجموعات، كل مجموعة = تظليل واحد فعلي
  function groupsIn(el) {
    var marks = Array.prototype.slice.call(el.querySelectorAll('mark'));
    var out = [];
    var i = 0;
    while (i < marks.length) {
      var g = [marks[i]];
      while (i + 1 < marks.length && sameHighlight(g[g.length - 1], marks[i + 1])) {
        g.push(marks[i + 1]); i++;
      }
      out.push(g);
      i++;
    }
    return out;
  }
  function groupOfMark(markEl) {
    var block = ownerBlockOf(markEl);
    if (!block) return [markEl];
    var gs = groupsIn(block);
    for (var i = 0; i < gs.length; i++) {
      if (gs[i].indexOf(markEl) !== -1) return gs[i];
    }
    return [markEl];
  }

  /* ترحيل التظليلات المحفوظة بالإصدار القديم:
     تُمنح معرّفات ثابتة ومعرّف مجموعة، ويُنقل تعليقها من المفتاح القديم (blockId:index). */
  function migrateLegacyMarks() {
    var changed = false;
    blocks.forEach(function (el) {
      var all = Array.prototype.slice.call(el.querySelectorAll('mark'));
      var indexOfMark = {};
      all.forEach(function (m, i) { indexOfMark[i] = m; });

      groupsIn(el).forEach(function (group) {
        var needsGroup = group.some(function (m) { return !m.dataset.hlGroup; });
        var gid = group[0].dataset.hlGroup || uid('g');
        var carriedNote = '';
        group.forEach(function (m) {
          if (!m.dataset.hlId) { m.dataset.hlId = uid('m'); changed = true; }
          if (needsGroup && m.dataset.hlGroup !== gid) { m.dataset.hlGroup = gid; changed = true; }
          var oldKey = el.dataset.ilmBlockId + ':' + all.indexOf(m);
          if (state.notes[oldKey]) {
            if (!carriedNote) carriedNote = state.notes[oldKey];
            delete state.notes[oldKey];
            changed = true;
          }
        });
        if (carriedNote && !state.notes[gid]) state.notes[gid] = carriedNote;
      });
    });
    if (changed) {
      blocks.forEach(function (el) {
        if (el.querySelector('mark')) saveBlockHtml(el);
      });
      persistState();
    }
  }

  /* ---------------- القائمة المنبثقة ---------------- */
  var savedRange = null;   // تحديد نصي جديد
  var activeGroup = null;  // تظليل قائم تم النقر عليه

  function positionFloating(elm, rect) {
    var x = rect.left + window.scrollX + rect.width / 2;
    var y = rect.bottom + window.scrollY + 10;
    elm.style.left = '0px'; elm.style.top = '0px';
    elm.classList.add('show');
    requestAnimationFrame(function () {
      var w = elm.offsetWidth;
      var maxX = window.scrollX + document.documentElement.clientWidth - w - 8;
      elm.style.left = Math.max(8, Math.min(x - w / 2, maxX)) + 'px';
      elm.style.top = y + 'px';
    });
  }

  function markCurrentColor(colorKey) {
    menu.querySelectorAll('.ilm-swatch').forEach(function (b) {
      b.classList.toggle('is-current', !!colorKey && b.dataset.color === colorKey);
    });
  }

  function showMenuForRange(range) {
    savedRange = range.cloneRange();
    activeGroup = null;
    clearActiveOutline();
    var rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    markCurrentColor(null);
    positionFloating(menu, rect);
  }

  function showMenuForGroup(group) {
    activeGroup = group;
    savedRange = null;
    clearActiveOutline();
    group.forEach(function (m) { m.classList.add('ilm-active'); });
    var first = group[0], last = group[group.length - 1];
    var r1 = first.getBoundingClientRect(), r2 = last.getBoundingClientRect();
    var rect = {
      left: Math.min(r1.left, r2.left),
      width: Math.max(r1.right, r2.right) - Math.min(r1.left, r2.left),
      bottom: Math.max(r1.bottom, r2.bottom)
    };
    var cur = COLOR_KEYS.filter(function (k) { return first.classList.contains(k); })[0];
    markCurrentColor(cur);
    positionFloating(menu, rect);
  }

  function clearActiveOutline() {
    zone.querySelectorAll('mark.ilm-active').forEach(function (m) { m.classList.remove('ilm-active'); });
  }
  function hideMenu() {
    menu.classList.remove('show');
    clearActiveOutline();
  }
  function hideNotePopover() { notePopover.classList.remove('show'); }

  var selTimer = null;
  function checkSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);
    var anc = range.commonAncestorContainer;
    if (anc.nodeType === 3) anc = anc.parentElement;
    if (!anc || !zone.contains(anc)) { hideMenu(); return; }
    if (anc.closest && anc.closest(SKIP_SELECTOR)) { hideMenu(); return; }
    if (sel.toString().trim().length === 0) { hideMenu(); return; }
    showMenuForRange(range);
  }
  document.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    selTimer = setTimeout(checkSelection, 200);
  });
  ['mousedown', 'touchstart'].forEach(function (ev) {
    menu.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('mousedown', function (e) {
    if (menu.contains(e.target) || notePopover.contains(e.target)) return;
    hideMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { hideMenu(); hideNotePopover(); }
  });

  // النقر على تظليل قائم يفتح شريط الأدوات له مباشرة (تغيير اللون / تعليق / حذف)
  zone.addEventListener('click', function (e) {
    var m = e.target.closest ? e.target.closest('mark') : null;
    if (!m || !zone.contains(m)) return;
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return; // تحديد جارٍ
    e.preventDefault();
    showMenuForGroup(groupOfMark(m));
  });

  /* ---------------- تغليف النطاق المحدد ---------------- */
  function getTextNodesInRange(range) {
    var root = range.commonAncestorContainer;
    if (root.nodeType === 3) root = root.parentNode;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (!range.intersectsNode(n)) continue;
      if (n.textContent === '') continue;
      if (!zone.contains(n)) continue;
      if (n.parentElement && n.parentElement.closest(SKIP_SELECTOR)) continue;
      nodes.push(n);
    }
    return nodes;
  }

  function wrapRange(range, className) {
    if (!range || range.collapsed) return null;
    var createdMarks = [];
    var gid = uid('g');

    function stamp(mk) {
      mk.dataset.hlId = uid('m');
      mk.dataset.hlGroup = gid;
    }

    if (range.startContainer === range.endContainer && range.startContainer.nodeType === 3) {
      try {
        var w = document.createElement('mark');
        w.className = className;
        stamp(w);
        range.surroundContents(w);
        return [w];
      } catch (e) { /* ننتقل لمسار العقد المتعددة */ }
    }

    var nodes = getTextNodesInRange(range);
    if (nodes.length === 0) return null;

    var last = nodes[nodes.length - 1];
    if (last === range.endContainer && range.endOffset < last.length) {
      last.splitText(range.endOffset);
    }
    var first = nodes[0];
    if (first === range.startContainer && range.startOffset > 0) {
      nodes[0] = first.splitText(range.startOffset);
    }

    nodes.forEach(function (node) {
      if (node.textContent === '') return;
      if (node.parentElement && node.parentElement.tagName === 'MARK') return; // مظلَّل بالفعل
      var mk = document.createElement('mark');
      mk.className = className;
      stamp(mk);
      node.parentNode.insertBefore(mk, node);
      mk.appendChild(node);
      createdMarks.push(mk);
    });
    return createdMarks.length ? createdMarks : null;
  }

  function unwrapNode(node) {
    var parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
    parent.normalize();
  }

  function removeGroup(group) {
    var blocksTouched = [];
    var key = noteKeyOf(group[0]);
    if (key) delete state.notes[key];
    group.forEach(function (m) {
      var b = ownerBlockOf(m);
      if (b && blocksTouched.indexOf(b) === -1) blocksTouched.push(b);
      delete state.notes[noteKeyOf(m)];
      unwrapNode(m);
    });
    return blocksTouched;
  }

  function removeFormattingInRange(range) {
    var blocksTouched = [];
    var targets = [];
    zone.querySelectorAll('mark').forEach(function (m) {
      if (range.intersectsNode(m)) targets.push(m);
    });
    if (!targets.length) {
      var node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentElement;
      var t = node && node.closest ? node.closest('mark') : null;
      if (t) targets.push(t);
    }
    targets.forEach(function (m) {
      var b = ownerBlockOf(m);
      if (b && blocksTouched.indexOf(b) === -1) blocksTouched.push(b);
      delete state.notes[noteKeyOf(m)];
      unwrapNode(m);
    });
    return blocksTouched;
  }

  function saveBlocks(list) {
    (list || []).forEach(function (b) { if (b) saveBlockHtml(b); });
    persistState();
  }
  function blocksOfMarks(marks) {
    var out = [];
    (marks || []).forEach(function (m) {
      var b = ownerBlockOf(m);
      if (b && out.indexOf(b) === -1) out.push(b);
    });
    return out;
  }

  /* ---------------- مؤشرات التعليق ---------------- */
  function applyNoteIndicators() {
    blocks.forEach(function (el) {
      groupsIn(el).forEach(function (group) {
        var has = !!state.notes[noteKeyOf(group[0])];
        group.forEach(function (m) { m.classList.toggle('hl-has-note', has); });
      });
    });
  }

  zone.addEventListener('mouseover', function (e) {
    var m = e.target.closest ? e.target.closest('mark.hl-has-note') : null;
    if (!m) { noteTip.classList.remove('show'); return; }
    var note = state.notes[noteKeyOf(m)];
    if (!note) { noteTip.classList.remove('show'); return; }
    noteTip.textContent = note;
    var rect = m.getBoundingClientRect();
    noteTip.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
    noteTip.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    noteTip.classList.add('show');
  });
  zone.addEventListener('mouseout', function (e) {
    if (e.target.closest && e.target.closest('mark.hl-has-note')) noteTip.classList.remove('show');
  });

  /* ---------------- أحداث شريط الأدوات ---------------- */
  var pendingNoteGroup = null;

  // معالج موحّد لأزرار شريط الأدوات (لون / تعليق / إزالة)، يُستدعى من الماوس واللمس معًا
  function handleMenuButton(btn) {
    var action = btn.dataset.action;
    var color = btn.dataset.color;
    if (!savedRange && !activeGroup) return;

    // ===== إزالة =====
    if (action === 'remove') {
      var touched = activeGroup ? removeGroup(activeGroup) : removeFormattingInRange(savedRange);
      clearSelection();
      hideMenu();
      applyNoteIndicators();
      saveBlocks(touched);
      refreshPanel();
      savedRange = null; activeGroup = null;
      return;
    }

    // ===== تعليق =====
    if (action === 'note') {
      var group = activeGroup;
      if (!group) {
        var made = wrapRangeIfNeeded(savedRange);
        if (!made) { hideMenu(); return; }
        group = made;
        applyNoteIndicators();
        saveBlocks(blocksOfMarks(group));
        refreshPanel();
      }
      openNotePopover(group);
      menu.classList.remove('show');
      return;
    }

    // ===== لون =====
    if (color) {
      var touchedBlocks;
      if (activeGroup) {
        activeGroup.forEach(function (m) {
          COLOR_KEYS.forEach(function (k) { m.classList.remove(k); });
          m.classList.add(color);
        });
        touchedBlocks = blocksOfMarks(activeGroup);
        markCurrentColor(color);
      } else {
        var marks = wrapRange(savedRange, color);
        if (!marks) { hideMenu(); return; }
        touchedBlocks = blocksOfMarks(marks);
      }
      clearSelection();
      hideMenu();
      applyNoteIndicators();
      saveBlocks(touchedBlocks);
      refreshPanel();
      savedRange = null; activeGroup = null;
    }
  }

  // على الهواتف: preventDefault على touchstart (أعلى الملف) يمنع المتصفح من توليد
  // حدث click الاصطناعي بعد اللمس، فنعالج touchend يدويًا مع حارس زمني يمنع التكرار
  // لو نفس اللمسة ولّدت click فعليًا على بعض المتصفحات.
  var lastTouchHandledAt = 0;
  menu.addEventListener('touchend', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    e.preventDefault();
    lastTouchHandledAt = Date.now();
    handleMenuButton(btn);
  }, { passive: false });

  menu.addEventListener('click', function (e) {
    if (Date.now() - lastTouchHandledAt < 500) return; // تم التعامل معها بالفعل عبر اللمس
    var btn = e.target.closest('button');
    if (!btn) return;
    handleMenuButton(btn);
  });

  function clearSelection() {
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }

  function wrapRangeIfNeeded(range) {
    var anc = range.commonAncestorContainer;
    if (anc.nodeType === 3) anc = anc.parentElement;
    var existing = anc && anc.closest ? anc.closest('mark') : null;
    if (existing) return groupOfMark(existing);
    return wrapRange(range, 'hl-yellow');
  }

  function openNotePopover(group) {
    if (!group || !group.length) return;
    pendingNoteGroup = group;
    var key = noteKeyOf(group[0]);
    var textarea = notePopover.querySelector('textarea');
    var quote = group.map(function (m) { return m.textContent; }).join('').trim();
    notePopover.querySelector('.ilm-note-quote').textContent = quote;
    textarea.value = state.notes[key] || '';
    var rect = group[0].getBoundingClientRect();
    positionFloating(notePopover, rect);
    setTimeout(function () { textarea.focus(); }, 30);
  }

  notePopover.querySelector('.ilm-note-save').addEventListener('click', function () {
    if (!pendingNoteGroup) return;
    var key = noteKeyOf(pendingNoteGroup[0]);
    var val = notePopover.querySelector('textarea').value.trim();
    if (val) state.notes[key] = val;
    else delete state.notes[key];
    hideNotePopover();
    applyNoteIndicators();
    saveBlocks(blocksOfMarks(pendingNoteGroup));
    refreshPanel();
    pendingNoteGroup = null;
    savedRange = null; activeGroup = null;
    clearSelection();
    hideMenu();
  });
  notePopover.querySelector('.ilm-note-cancel').addEventListener('click', function () {
    hideNotePopover();
    pendingNoteGroup = null;
    hideMenu();
  });

  /* ---------------- البطاقات ---------------- */
  function collectExportCards() {
    var cards = [];
    blocks.forEach(function (el) {
      groupsIn(el).forEach(function (group) {
        var front = group.map(function (m) { return m.textContent; }).join('').replace(/\s+/g, ' ').trim();
        if (!front) return;
        var color = COLOR_KEYS.filter(function (k) { return group[0].classList.contains(k); })[0] || 'hl-yellow';
        cards.push({
          q: front,
          a: state.notes[noteKeyOf(group[0])] || '',
          color: color,
          group: group
        });
      });
    });
    return cards;
  }

  function cleanTsvField(t) {
    return String(t).replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();
  }

  function downloadHighlightsTSV() {
    var cards = collectExportCards();
    if (!cards.length) return;
    var lines = cards.map(function (c) {
      return cleanTsvField(c.q) + '\t' + cleanTsvField(c.a || '(بدون تعليق)');
    });
    var blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/tab-separated-values;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'هايلايت_' + LECTURE_ID + '.tsv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyAllCards(btn) {
    var cards = collectExportCards();
    if (!cards.length) return;
    var text = cards.map(function (c, i) {
      return (i + 1) + '. ' + c.q + (c.a ? '\n   ← ' + c.a : '');
    }).join('\n\n');
    var done = function () {
      var old = btn.textContent;
      btn.textContent = '✓ تم النسخ';
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  var panel = null;
  function colorBgOf(key) {
    var c = COLORS.filter(function (x) { return x.key === key; })[0];
    return c ? c.bg : '#fdf0a8';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function refreshPanel() {
    if (!panel) return;
    var cards = collectExportCards();
    var listEl = panel.querySelector('.ilm-card-list');
    var badge = panel.querySelector('.ilm-badge');
    var actions = panel.querySelectorAll('.ilm-export-btn');

    badge.textContent = cards.length ? (cards.length + ' بطاقة') : 'لا شيء بعد';
    actions.forEach(function (b) { b.disabled = cards.length === 0; });

    if (!cards.length) {
      listEl.innerHTML = '<div class="ilm-empty">لم تُظلِّل شيئًا بعد.<br>حدِّد أي نص في المحاضرة بالماوس أو بالإصبع، ثم اختر لونًا من الشريط الذي يظهر.</div>';
      return;
    }
    listEl.innerHTML = cards.map(function (c, i) {
      return '<div class="ilm-card" data-card-index="' + i + '">' +
        '<span class="ilm-card-dot" style="background:' + colorBgOf(c.color) + '"></span>' +
        '<div class="ilm-card-main">' +
        '<div class="ilm-card-q">' + escapeHtml(c.q) + '</div>' +
        '<div class="ilm-card-a' + (c.a ? '' : ' is-empty') + '">' +
        (c.a ? escapeHtml(c.a) : 'بدون تعليق') + '</div>' +
        '</div>' +
        '<div class="ilm-card-tools">' +
        '<button type="button" data-act="go" title="اذهب إلى موضعه">↩</button>' +
        '<button type="button" data-act="note" title="تعديل التعليق">💬</button>' +
        '<button type="button" class="ilm-del" data-act="del" title="حذف التظليل">✕</button>' +
        '</div></div>';
    }).join('');

    listEl.querySelectorAll('.ilm-card').forEach(function (cardEl) {
      var idx = parseInt(cardEl.dataset.cardIndex, 10);
      cardEl.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          var fresh = collectExportCards()[idx];
          if (!fresh) return;
          var act = b.dataset.act;
          if (act === 'go') {
            fresh.group[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            fresh.group.forEach(function (m) { m.classList.add('ilm-active'); });
            setTimeout(clearActiveOutline, 1800);
          } else if (act === 'note') {
            fresh.group[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function () { openNotePopover(fresh.group); }, 420);
          } else if (act === 'del') {
            var touched = removeGroup(fresh.group);
            applyNoteIndicators();
            saveBlocks(touched);
            refreshPanel();
          }
        });
      });
    });
  }

  function mountExportSection() {
    panel = document.createElement('div');
    panel.className = 'ilm-export-section is-open';
    panel.innerHTML =
      '<div class="ilm-export-head">' +
      '<h3>📌 بطاقات ملاحظاتي <span class="ilm-badge"></span></h3>' +
      '<span class="ilm-chevron">▼</span>' +
      '</div>' +
      '<div class="ilm-export-body">' +
      '<p class="ilm-export-hint">كل تظليل هنا بطاقة مراجعة واحدة: النص المظلَّل هو وجه السؤال، وتعليقك عليه هو وجه الإجابة. يمكنك الرجوع لموضع أي تظليل، أو تعديل تعليقه، أو حذفه.</p>' +
      '<div class="ilm-card-list"></div>' +
      '<div class="ilm-export-actions">' +
      '<button type="button" class="ilm-export-btn" id="ilm-export-btn">⬇ تحميل بطاقات أنكي (TSV)</button>' +
      '<button type="button" class="ilm-export-btn secondary" id="ilm-copy-btn">📋 نسخ الكل كنص</button>' +
      '</div></div>';

    if (zone.parentElement) zone.parentElement.insertBefore(panel, zone.nextSibling);
    else document.body.appendChild(panel);

    panel.querySelector('.ilm-export-head').addEventListener('click', function () {
      panel.classList.toggle('is-open');
    });
    panel.querySelector('#ilm-export-btn').addEventListener('click', downloadHighlightsTSV);
    var copyBtn = panel.querySelector('#ilm-copy-btn');
    copyBtn.addEventListener('click', function () { copyAllCards(copyBtn); });

    refreshPanel();
  }

  /* ---------------- بدء التشغيل ---------------- */
  function init() {
    mountExportSection();
    syncFromCloudOnce();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
