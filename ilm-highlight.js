/* =========================================================
   ilm-highlight.js
   نظام هايلايت نصوص + تعليقات + تصدير بطاقات أنكي
   لمحاضرات "منهجي في طلب العلم" ذات المحتوى الفعلي المكتوب

   - يعمل على أي محتوى نصي داخل عنصر يحمل data-ilm-highlight-zone
   - 4 ألوان هايلايت (أصفر/أخضر/وردي/أزرق) + تعليق اختياري لكل تحديد
   - تخزين محلي + مزامنة سحابية عبر window.ManhajCloud (إن وُجدت)
   - تصدير TSV لأنكي: النص المحدد = الوجه الأمامي، التعليق = الوجه الخلفي
     (أو نص مؤشِّر إن لم يوجد تعليق)

   الإضافة في الصفحة (قرب نهاية body، بعد المحتوى):
   <script src="[المسار]/ilm-highlight.js" data-lecture-id="[معرّف المحاضرة]"></script>
   ويجب أن يحيط عنصر واحد على الأقل بالمحتوى القابل للتحديد بالسمة:
   data-ilm-highlight-zone (مثال: <main data-ilm-highlight-zone> ... </main>)
   إن لم توجد هذه السمة في الصفحة، تُستخدم <body> كاملة كمنطقة افتراضية.
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

  /* ---------------- الأنماط ---------------- */
  var style = document.createElement('style');
  style.textContent = `
    mark.hl-yellow{ background:#fdf0a8; color:inherit; border-radius:2px; padding:0 1px; }
    mark.hl-green{  background:#c9edd3; color:inherit; border-radius:2px; padding:0 1px; }
    mark.hl-pink{   background:#f8d2e0; color:inherit; border-radius:2px; padding:0 1px; }
    mark.hl-blue{   background:#c7e2f7; color:inherit; border-radius:2px; padding:0 1px; }
    mark.hl-has-note{ box-shadow:0 2px 0 0 #2b2a24 inset; cursor:help; }

    #ilm-hl-menu{
      position:absolute; z-index:9500; display:none;
      background:#2b2a24; border-radius:10px; padding:6px;
      box-shadow:0 6px 20px rgba(0,0,0,.25);
      direction:rtl; gap:4px; align-items:center;
    }
    #ilm-hl-menu.show{ display:flex; }
    #ilm-hl-menu button{
      width:28px; height:28px; border:2px solid rgba(255,255,255,.25); border-radius:50%;
      cursor:pointer; padding:0; flex-shrink:0;
    }
    #ilm-hl-menu button.ilm-note-btn{
      width:auto; height:28px; border-radius:14px; border:none;
      background:#fff; color:#2b2a24; font-size:12px; font-family:'Tajawal',sans-serif;
      padding:0 10px; display:flex; align-items:center; gap:4px;
    }
    #ilm-hl-menu button.ilm-remove-btn{
      width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,.25);
      background:#914b34; color:#fff; font-size:13px; display:flex; align-items:center; justify-content:center;
    }
    #ilm-hl-menu .ilm-sep{ width:1px; height:18px; background:rgba(255,255,255,.2); margin:0 2px; }

    #ilm-note-popover{
      position:absolute; z-index:9600; display:none;
      width:280px; max-width:88vw; background:#fbfaf4; border:1px solid #d3d8ca; border-radius:12px;
      padding:14px; box-shadow:0 8px 24px rgba(0,0,0,.18); direction:rtl;
      font-family:'Tajawal','Segoe UI',Tahoma,sans-serif;
    }
    #ilm-note-popover.show{ display:block; }
    #ilm-note-popover textarea{
      width:100%; box-sizing:border-box; min-height:80px; resize:vertical;
      border:1px solid #d3d8ca; border-radius:8px; padding:8px 10px;
      font-family:inherit; font-size:13.5px; color:#2b2a24; outline:none;
    }
    #ilm-note-popover textarea:focus{ border-color:#b8862f; }
    #ilm-note-popover .ilm-note-actions{ display:flex; gap:8px; margin-top:8px; }
    #ilm-note-popover button{
      flex:1; padding:8px; border:none; border-radius:8px; cursor:pointer;
      font-family:inherit; font-size:13px; font-weight:600;
    }
    #ilm-note-popover .ilm-note-save{ background:#1f4a3d; color:#fff; }
    #ilm-note-popover .ilm-note-cancel{ background:#e3ebe4; color:#2b2a24; }

    .ilm-hl-note-tip{
      position:absolute; z-index:9550; display:none; max-width:260px;
      background:#2b2a24; color:#f4efe4; font-size:12.5px; line-height:1.7;
      border-radius:8px; padding:9px 12px; direction:rtl;
      font-family:'Tajawal',sans-serif; box-shadow:0 4px 14px rgba(0,0,0,.2);
    }
    .ilm-hl-note-tip.show{ display:block; }

    .ilm-export-section{
      max-width:700px; margin:40px auto 20px; padding:20px 22px;
      background:#fbfaf4; border:1px solid #d3d8ca; border-radius:14px;
      font-family:'Tajawal','Segoe UI',Tahoma,sans-serif; direction:rtl; text-align:center;
    }
    .ilm-export-section h3{ margin:0 0 6px; font-family:'Amiri','Tajawal',serif; font-size:19px; color:#163931; }
    .ilm-export-section p{ margin:0 0 14px; font-size:13px; color:#6a6a5b; }
    .ilm-export-btn{
      display:inline-block; padding:11px 26px; background:#1f4a3d; color:#fff;
      border:none; border-radius:10px; font-family:inherit; font-size:14.5px; font-weight:600;
      cursor:pointer; transition:background .15s;
    }
    .ilm-export-btn:hover{ background:#163931; }
    .ilm-export-btn:disabled{ opacity:.5; cursor:not-allowed; }
    .ilm-export-count{ margin-top:10px; font-size:12px; color:#6a6a5b; }
  `;
  document.head.appendChild(style);

  /* ---------------- عناصر الواجهة ---------------- */
  var menu = document.createElement('div');
  menu.id = 'ilm-hl-menu';
  menu.innerHTML = COLORS.map(function (c) {
    return '<button type="button" data-color="' + c.key + '" style="background:' + c.bg + '" title="' + c.label + '"></button>';
  }).join('') +
    '<span class="ilm-sep"></span>' +
    '<button type="button" class="ilm-note-btn" data-action="note">💬 تعليق</button>' +
    '<span class="ilm-sep"></span>' +
    '<button type="button" class="ilm-remove-btn" data-action="remove" title="إزالة الهايلايت">✕</button>';
  document.body.appendChild(menu);

  var notePopover = document.createElement('div');
  notePopover.id = 'ilm-note-popover';
  notePopover.innerHTML =
    '<textarea placeholder="اكتب تعليقك هنا..."></textarea>' +
    '<div class="ilm-note-actions">' +
    '<button type="button" class="ilm-note-save">حفظ</button>' +
    '<button type="button" class="ilm-note-cancel">إلغاء</button>' +
    '</div>';
  document.body.appendChild(notePopover);

  var noteTip = document.createElement('div');
  noteTip.className = 'ilm-hl-note-tip';
  document.body.appendChild(noteTip);

  /* ---------------- منطقة الهايلايت ---------------- */
  var zone = document.querySelector('[data-ilm-highlight-zone]') || document.body;

  var blocks = [];
  (function indexBlocks() {
    var BLOCK_TAGS = ['P', 'LI', 'BLOCKQUOTE', 'TD', 'TH', 'DD', 'DT', 'FIGCAPTION'];
    var candidates = zone.querySelectorAll(BLOCK_TAGS.join(','));
    var idx = 0;
    candidates.forEach(function (el) {
      if (!el.textContent || !el.textContent.trim()) return;
      if (el.closest('.ilm-export-section, #ilm-hl-menu, #ilm-note-popover')) return;
      if (!el.dataset.ilmBlockId) el.dataset.ilmBlockId = 'b' + (idx++);
      blocks.push(el);
    });
  })();

  /* ---------------- تخزين محلي + سحابي ---------------- */
  function readLocal() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && typeof raw === 'object') return raw;
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
    applyNoteIndicators();
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

  /* ---------------- القائمة المنبثقة عند التحديد ---------------- */
  var savedRange = null;

  function showMenuForRange(range) {
    savedRange = range.cloneRange();
    var rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    var x = rect.left + window.scrollX + rect.width / 2;
    var y = rect.bottom + window.scrollY + 10;
    menu.style.left = '0px'; menu.style.top = '0px';
    menu.classList.add('show');
    requestAnimationFrame(function () {
      var w = menu.offsetWidth;
      var finalX = Math.max(8, Math.min(x - w / 2, window.scrollX + document.documentElement.clientWidth - w - 8));
      menu.style.left = finalX + 'px';
      menu.style.top = y + 'px';
    });
  }
  function hideMenu() { menu.classList.remove('show'); }
  function hideNotePopover() { notePopover.classList.remove('show'); }

  var selTimer = null;
  function checkSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { hideMenu(); return; }
    var range = sel.getRangeAt(0);
    var anc = range.commonAncestorContainer;
    if (anc.nodeType === 3) anc = anc.parentElement;
    if (!zone.contains(anc)) { hideMenu(); return; }
    if (anc.closest && anc.closest('#ilm-hl-menu, #ilm-note-popover, .ilm-export-section')) { hideMenu(); return; }
    if (sel.toString().trim().length === 0) { hideMenu(); return; }
    showMenuForRange(range);
  }
  document.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    selTimer = setTimeout(checkSelection, 300);
  });
  ['mousedown', 'touchstart'].forEach(function (ev) {
    menu.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('mousedown', function (e) {
    if (!menu.contains(e.target)) hideMenu();
  });

  /* ---------------- التفاف النطاق المحدد بعنصر mark ---------------- */
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
      nodes.push(n);
    }
    return nodes;
  }

  function wrapRange(range, className) {
    if (!range || range.collapsed) return null;
    var createdMarks = [];

    if (range.startContainer === range.endContainer && range.startContainer.nodeType === 3) {
      try {
        var w = document.createElement('mark');
        w.className = className;
        range.surroundContents(w);
        createdMarks.push(w);
        return createdMarks;
      } catch (e) { /* fall through to multi-node path */ }
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
      var mk = document.createElement('mark');
      mk.className = className;
      node.parentNode.insertBefore(mk, node);
      mk.appendChild(node);
      createdMarks.push(mk);
    });
    return createdMarks;
  }

  function unwrapNode(node) {
    var parent = node.parentNode;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
    parent.normalize();
  }

  function removeFormattingInRange(range) {
    if (!range) return;
    var marks = zone.querySelectorAll('mark');
    var removed = false;
    marks.forEach(function (m) {
      if (range.intersectsNode(m)) {
        delete state.notes[markKey(m)];
        unwrapNode(m);
        removed = true;
      }
    });
    if (!removed) {
      var node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentElement;
      var target = node && node.closest ? node.closest('mark') : null;
      if (target) { delete state.notes[markKey(target)]; unwrapNode(target); }
    }
  }

  function ownerBlockOf(node) {
    var el = node.nodeType === 3 ? node.parentElement : node;
    return el ? el.closest('[data-ilm-block-id]') : null;
  }

  function markKey(markEl) {
    var block = ownerBlockOf(markEl);
    var blockId = block ? block.dataset.ilmBlockId : 'unknown';
    var allMarksInBlock = block ? Array.prototype.slice.call(block.querySelectorAll('mark')) : [];
    var idx = allMarksInBlock.indexOf(markEl);
    return blockId + ':' + idx;
  }

  function persistAfterEdit() {
    var block = savedRange ? ownerBlockOf(savedRange.commonAncestorContainer) : null;
    if (block) saveBlockHtml(block);
    else {
      blocks.forEach(function (el) { saveBlockHtml(el); });
    }
    persistState();
  }

  /* ---------------- مؤشرات وجود تعليق + تلميح عند المرور ---------------- */
  function applyNoteIndicators() {
    blocks.forEach(function (el) {
      var marks = el.querySelectorAll('mark');
      marks.forEach(function (m) {
        var key = markKey(m);
        if (state.notes[key]) m.classList.add('hl-has-note');
        else m.classList.remove('hl-has-note');
      });
    });
  }

  zone.addEventListener('mouseover', function (e) {
    var m = e.target.closest ? e.target.closest('mark.hl-has-note') : null;
    if (!m) { noteTip.classList.remove('show'); return; }
    var key = markKey(m);
    var note = state.notes[key];
    if (!note) { noteTip.classList.remove('show'); return; }
    noteTip.textContent = note;
    var rect = m.getBoundingClientRect();
    noteTip.style.left = (rect.left + window.scrollX) + 'px';
    noteTip.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    noteTip.classList.add('show');
  });
  zone.addEventListener('mouseout', function (e) {
    if (e.target.closest && e.target.closest('mark.hl-has-note')) noteTip.classList.remove('show');
  });

  /* ---------------- أحداث القائمة المنبثقة ---------------- */
  var pendingNoteMark = null;

  menu.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn || !savedRange) return;
    var action = btn.dataset.action;
    var color = btn.dataset.color;

    if (action === 'remove') {
      removeFormattingInRange(savedRange);
      var sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      hideMenu();
      persistAfterEdit();
      applyNoteIndicators();
      savedRange = null;
      return;
    }

    if (action === 'note') {
      var marks = wrapRangeIfNeeded(savedRange);
      openNotePopover(marks && marks[0]);
      hideMenu();
      return;
    }

    if (color) {
      wrapRange(savedRange, color);
      var sel2 = window.getSelection();
      if (sel2) sel2.removeAllRanges();
      hideMenu();
      persistAfterEdit();
      applyNoteIndicators();
      savedRange = null;
    }
  });

  function wrapRangeIfNeeded(range) {
    var anc = range.commonAncestorContainer;
    if (anc.nodeType === 3) anc = anc.parentElement;
    if (anc && anc.closest && anc.closest('mark')) {
      return [anc.closest('mark')];
    }
    return wrapRange(range, 'hl-yellow');
  }

  function openNotePopover(markEl) {
    if (!markEl) return;
    pendingNoteMark = markEl;
    var key = markKey(markEl);
    var textarea = notePopover.querySelector('textarea');
    textarea.value = state.notes[key] || '';
    var rect = markEl.getBoundingClientRect();
    notePopover.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
    notePopover.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    notePopover.classList.add('show');
    textarea.focus();
  }

  notePopover.querySelector('.ilm-note-save').addEventListener('click', function () {
    if (!pendingNoteMark) return;
    var key = markKey(pendingNoteMark);
    var val = notePopover.querySelector('textarea').value.trim();
    if (val) state.notes[key] = val;
    else delete state.notes[key];
    hideNotePopover();
    persistAfterEdit();
    applyNoteIndicators();
    pendingNoteMark = null;
    savedRange = null;
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  });
  notePopover.querySelector('.ilm-note-cancel').addEventListener('click', function () {
    hideNotePopover();
    pendingNoteMark = null;
  });

  /* ---------------- قسم التصدير لأنكي ---------------- */

  // يتحقق هل mark ملاصق مباشرة لعنصر mark آخر (بدون أي فاصل نصي حقيقي بينهما)
  // هذا يحدث حين يقسّم wrapRange تظليلًا واحدًا بصريًا إلى عدة عناصر <mark>
  // بسبب عبوره على أكثر من عقدة نصية (نص عادي + آية بتنسيق مختلف + بولد...إلخ)
  function isAdjacentMark(a, b) {
    if (!a || !b) return false;
    var node = a.nextSibling;
    while (node) {
      if (node === b) return true;
      // يسمح بالمرور عبر نص فارغ (مسافات/أسطر جديدة) فقط، أي شيء آخر يقطع التجاور
      if (node.nodeType === 3 && node.textContent.trim() === '') { node = node.nextSibling; continue; }
      return false;
    }
    return false;
  }

  function collectExportCards() {
    var cards = [];
    blocks.forEach(function (el) {
      var marks = Array.prototype.slice.call(el.querySelectorAll('mark'));
      var i = 0;
      while (i < marks.length) {
        var group = [marks[i]];
        // اجمع كل الـ mark المتجاورة تباعًا في نفس المجموعة (تمثل تظليلًا واحدًا فعليًا)
        while (i + 1 < marks.length && isAdjacentMark(group[group.length - 1], marks[i + 1])) {
          group.push(marks[i + 1]);
          i++;
        }
        var front = group.map(function (m) { return m.textContent; }).join('').trim();
        i++;
        if (!front) continue;
        // التعليق: أول ملاحظة موجودة على أي جزء من المجموعة
        var back = '(بدون تعليق)';
        for (var g = 0; g < group.length; g++) {
          var note = state.notes[markKey(group[g])];
          if (note) { back = note; break; }
        }
        cards.push({ q: front, a: back });
      }
    });
    return cards;
  }

  function cleanTsvField(t) {
    return String(t).replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();
  }

  function downloadHighlightsTSV() {
    var cards = collectExportCards();
    if (!cards.length) return;
    var lines = cards.map(function (c) { return cleanTsvField(c.q) + '\t' + cleanTsvField(c.a); });
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

  function mountExportSection() {
    var section = document.createElement('div');
    section.className = 'ilm-export-section';
    section.innerHTML =
      '<h3>📌 بطاقات ملاحظاتي</h3>' +
      '<p>كل نص هايلايت يتحوّل لبطاقة أنكي؛ التعليق (إن وُجد) هو وجه الإجابة</p>' +
      '<button type="button" class="ilm-export-btn" id="ilm-export-btn">⬇ تحميل بطاقات الملاحظات (TSV)</button>' +
      '<div class="ilm-export-count" id="ilm-export-count"></div>';
    if (zone.parentElement) zone.parentElement.insertBefore(section, zone.nextSibling);
    else document.body.appendChild(section);

    var btn = section.querySelector('#ilm-export-btn');
    var countEl = section.querySelector('#ilm-export-count');

    function refreshCount() {
      var n = collectExportCards().length;
      countEl.textContent = n > 0 ? ('عدد البطاقات المتاحة للتصدير: ' + n) : 'لم تُحدَّد أي هايلايت بعد';
      btn.disabled = n === 0;
    }
    btn.addEventListener('click', downloadHighlightsTSV);
    refreshCount();

    var observer = new MutationObserver(refreshCount);
    observer.observe(zone, { childList: true, subtree: true });
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
