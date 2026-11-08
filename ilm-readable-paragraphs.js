/* فواصل قراءة لمحاضرات «معالجة القرآن لنفوس المصلحين».
 * لا يغيّر هذا الملف أي حرف في النص أو ترتيب الفوائد أو عناصرها.
 * يضيف مسافات مرئية بعد جمل مكتملة داخل الفائدة/الفقرة نفسها.
 * لا يضيف <p> أو <li> جديدة: تبقى معرفات التظليل والهوامش كما هي.
 */
(function () {
  'use strict';

  var MIN_TOTAL = 340;
  var MIN_PART = 125;
  var MIN_TAIL = 95;
  var MAX_PART = 720;
  var TARGET = 235;
  var MARK_CLASS = 'ilm-reading-break';
  var SKIP_INSIDE = 'mark, sup, a, button, q, .ord, .quran, .hadith, .ayat, .aya, .qi, .hi, .sem-aya, .sem-hadith';
  var pending = false;

  function splitPositions(text) {
    if (text.length < MIN_TOTAL) return [];

    var ends = [];
    var inVerse = 0, inQuote = 0, inParens = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === '﴿') { inVerse++; continue; }
      if (ch === '﴾') { inVerse = Math.max(0, inVerse - 1); continue; }
      if (ch === '«' || ch === '“') { inQuote++; continue; }
      if (ch === '»' || ch === '”') { inQuote = Math.max(0, inQuote - 1); continue; }
      if (ch === '(') { inParens++; continue; }
      if (ch === ')') { inParens = Math.max(0, inParens - 1); continue; }
      if (inVerse || inQuote || inParens) continue;
      if (ch !== '.' && ch !== '؟' && ch !== '!' && ch !== '؛') continue;
      if (i + 1 < text.length && !/\s/.test(text.charAt(i + 1))) continue;
      ends.push({ at: i + 1, soft: ch === '؛' });
    }

    var breaks = [];
    var from = 0;
    while (text.length - from >= MIN_TOTAL) {
      var best = null, bestScore = Infinity;
      for (var j = 0; j < ends.length; j++) {
        var e = ends[j];
        var part = e.at - from;
        if (part < MIN_PART || part > MAX_PART || text.length - e.at < MIN_TAIL) continue;
        var score = Math.abs(part - TARGET) + (e.soft ? 105 : 0) + (part > 460 ? 65 : 0);
        if (score < bestScore) { best = e; bestScore = score; }
      }
      if (!best) break; // لا نقسم وسط جملة لمجرد بلوغ عدد من الأحرف
      breaks.push(best.at);
      from = best.at;
    }
    return breaks;
  }

  function locate(nodes, position) {
    for (var i = 0; i < nodes.length; i++) {
      var item = nodes[i];
      if (position > item.start && position <= item.end) {
        return { node: item.node, offset: position - item.start };
      }
    }
    return null;
  }

  function formatBlock(block) {
    if (block.querySelector('.' + MARK_CLASS)) return;
    if (block.querySelector('p, ol, ul, br')) return;
    if (block.closest('.quizwrap, .summary, #cards, .key, .note, .naql, .quran, .hadith')) return;

    var text = block.textContent || '';
    var candidatePositions = splitPositions(text);
    if (!candidatePositions.length) return;

    // ترتيب عقد النص كما هي، ومن دون تغيير المحتوى أو إدخال فقرات مفهرسة جديدة.
    var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    var nodes = [], position = 0, node;
    while ((node = walker.nextNode())) {
      nodes.push({ node: node, start: position, end: position + node.data.length });
      position += node.data.length;
    }

    var insertionPoints = [];
    for (var i = 0; i < candidatePositions.length; i++) {
      var loc = locate(nodes, candidatePositions[i]);
      if (!loc) continue;
      var parent = loc.node.parentElement;
      if (!parent || parent.closest(SKIP_INSIDE)) continue;
      insertionPoints.push(loc);
    }

    // من النهاية إلى البداية للحفاظ على إزاحات عقد النص المحسوبة أعلاه.
    for (var k = insertionPoints.length - 1; k >= 0; k--) {
      var point = insertionPoints[k];
      if (!point.node.parentNode) continue;
      var separator = document.createElement('span');
      separator.className = MARK_CLASS;
      separator.setAttribute('aria-hidden', 'true');
      var range = document.createRange();
      range.setStart(point.node, point.offset);
      range.collapse(true);
      range.insertNode(separator);
      range.detach();
    }
  }

  function formatAll() {
    var root = document.querySelector('main .content');
    if (!root) return;
    root.querySelectorAll('ol.fawaid > li, p').forEach(function (block) {
      if (block.matches('p.lbl, p.isti')) return;
      formatBlock(block);
    });
  }

  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      formatAll();
    });
  }

  function init() {
    if (!document.querySelector('main .content')) return;
    var style = document.createElement('style');
    style.id = 'ilm-reading-break-style';
    style.textContent =
      '.ilm-reading-break{display:block;height:0;margin-block-start:.62em;pointer-events:none}' +
      '.fawaid>li .ilm-reading-break{margin-block-start:.76em}' +
      '@media print{.ilm-reading-break{margin-block-start:.45em}}';
    document.head.appendChild(style);
    formatAll();

    // مزامنة التظليل قد تعيد innerHTML قديمًا: نسترجع الفواصل تلقائيًا.
    if (window.MutationObserver) {
      var root = document.querySelector('main .content');
      var observer = new MutationObserver(function (changes) {
        for (var i = 0; i < changes.length; i++) {
          if (changes[i].addedNodes && changes[i].addedNodes.length) {
            schedule();
            break;
          }
        }
      });
      observer.observe(root, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
