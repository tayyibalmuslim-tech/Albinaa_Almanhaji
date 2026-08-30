/* ilm-semantic.js — الطبقة الدلالية للألوان (آلية العمل 5.3، بند 5-ب)
 *
 * يلوّن، وقت التشغيل فقط:
 *   الآيات  ﴿…﴾   أخضر غامق
 *   الأحاديث «…»  بنفسجي
 *   الأعلام        أحمر غامق (وعريض لو عالمًا أو صحابيًا أو من السلف)
 *
 * لماذا وقت التشغيل لا في الـHTML؟
 *   ilm-highlight.js يحفظ innerHTML الفقرة كاملة ويستعيدها فوق أي تعديل لاحق،
 *   فالتلوين المكتوب في الملف يُمحى عند القارئ الذي عنده تظليل محفوظ.
 *   هذه الطبقة تعيد التلوين بعد كل استعادة، ولا تضيف ولا تحذف أي بلوك،
 *   فلا تزحزح معرّفات البلوكات ولا تُبطل تظليلًا. (بند 12-ب)
 */
(function () {
  'use strict';

  /* ============ 1. الأعلام ============ */

  /* علماء وصحابة وتابعون ← أحمر + عريض */
  var SCHOLARS = [
    'ابن جرير الطبري', 'الطاهر بن عاشور', 'ابن حجر العسقلاني', 'أبو بكر الصديق',
    'عمر بن الخطاب', 'علي بن أبي طالب', 'عثمان بن عفان', 'أنس بن مالك',
    'عبد الله بن مسعود', 'عبد الله بن عباس', 'عبد الله بن عمر', 'سعيد بن جبير',
    'الحسن البصري', 'ابن عبد البر', 'ابن أبي حاتم', 'ابن الجوزي', 'ابن تيمية',
    'ابن القيم', 'ابن كثير', 'ابن عاشور', 'ابن عطية', 'ابن رجب', 'ابن جرير',
    'ابن عباس', 'ابن مسعود', 'ابن عمر', 'ابن سعدي', 'ابن حجر', 'ابن ماجه',
    'ابن عرفة', 'ابن هشام', 'ابن إسحاق', 'أبو هريرة', 'أبي هريرة',
    'أبو الدرداء', 'أبي الدرداء', 'أبو داود', 'أبي داود', 'أبو حنيفة',
    'الطبري', 'القرطبي', 'البغوي', 'السعدي', 'الشوكاني', 'الزمخشري',
    'الآلوسي', 'الرازي', 'البخاري', 'الترمذي', 'النسائي', 'الدارمي',
    'النووي', 'الذهبي', 'الشافعي', 'الأوزاعي', 'الزهري', 'مجاهد', 'قتادة',
    'عكرمة', 'طاوس', 'الضحاك', 'السدي', 'مقاتل', 'أحمد السيد'
  ];

  /* أعلام أخرى: أنبياء وشخصيات ← أحمر بلا تعريض */
  var FIGURES = [
    'إبراهيم', 'إسماعيل', 'إسحاق', 'يعقوب', 'يوسف', 'موسى', 'هارون',
    'عيسى', 'زكريا', 'يحيى', 'نوح', 'هود', 'شعيب', 'لوط', 'يونس',
    'داود', 'سليمان', 'أيوب', 'إدريس', 'ذو الكفل', 'اليسع', 'آدم',
    'مريم', 'سارة', 'هاجر', 'آسية', 'بلقيس', 'خديجة', 'عائشة', 'فاطمة',
    'فرعون', 'النمرود', 'نمرود', 'قارون', 'هامان', 'أبي لهب', 'أبو لهب',
    'أبي جهل', 'أبو جهل', 'أبي سفيان', 'أبو سفيان', 'جبريل', 'ميكائيل',
    'إسرافيل', 'السامري', 'لقمان', 'ذو القرنين'
  ];

  /* ألفاظ لا تُلوَّن أبدًا: مشتركة مع كلمات عامة، أو لفظ جلالة.
     (بند 5-ب/3: اللون الخاطئ أسوأ من غياب اللون) */
  var FORBIDDEN = /^(?:صالح|مسلم|مالك|حسن|حسين|كريم|رحيم|عزيز|حكيم|جميل|أمين|سعيد|منصور|عادل|رشيد|بشير|نذير|مؤمن|محسن|الله|الرحمن|الرحيم)$/;

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function byLen(a, b) { return b.length - a.length; }

  var AR = '\u0621-\u064A';
  /* حدّ الكلمة العربية: بداية النص أو حرف غير عربي، ثم بادئة عطف/جر ملتصقة
     اختيارية (و ف ل ب ك) لأن «وابن تيمية» و«بالطبري» شائعتان، ثم الاسم،
     على ألا يتبعه حرف عربي (يمنع مطابقة «ابن كثير» داخل «ابن كثيرا»).
     المجموعة 1 = ما قبل، المجموعة 2 = البادئة، المجموعة 3 = الاسم الملوَّن. */
  function nameRe(list) {
    return new RegExp(
      '(^|[^' + AR + '])([\u0648\u0641\u0644\u0628\u0643]?)(' +
      list.slice().sort(byLen).map(esc).join('|') + ')(?![' + AR + '])',
      'g'
    );
  }
  var RE_SCHOLAR = nameRe(SCHOLARS);
  var RE_FIGURE = nameRe(FIGURES);
  var RE_AYA = /﴿[\s\S]*?﴾/g;
  var RE_HADITH = /«[\s\S]*?»/g;

  /* ============ 2. أدوات DOM ============ */

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, SVG: 1, NOSCRIPT: 1 };
  /* .ayat/.aya/.quran/.hadith بلوكات نصّها كله وحي، فالـCSS يلوّنها كاملة
     وأنسحب منها: في «أنوار» القوس الكبير يفتح مرة ويُغلق بعد اثنتي عشرة آية،
     وأرقام الآيات بينهما بين قوسين، فلا يصلح فيها التقاط ﴿…﴾.
     أمّا .ayah (معالجة القرآن) فيسبق الآيةَ فيها «قوله تعالى»، فتُعالَج هنا. */
  var SKIP_CLOSEST = '.sem-aya, .sem-hadith, .sem-name, .ayat, .aya, .quran, .hadith,' +
    '.ilm-export-section, #ilm-hl-menu, #ilm-note-popover, .quiz, .cards-wrap, .toc, .deck';

  function shouldSkip(node) {
    var p = node.parentNode;
    if (!p || p.nodeType !== 1) return true;
    if (SKIP_TAGS[p.tagName]) return true;
    if (p.closest && p.closest(SKIP_CLOSEST)) return true;
    return false;
  }

  /* يستبدل عقدة نصية بأجزاء ملوّنة حسب دالة تقسيم */
  function replaceNode(textNode, parts) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.cls) {
        var s = document.createElement('span');
        s.className = p.cls;
        s.textContent = p.text;
        frag.appendChild(s);
      } else if (p.text) {
        frag.appendChild(document.createTextNode(p.text));
      }
    }
    textNode.parentNode.replaceChild(frag, textNode);
  }

  /* يقسّم نصًا على regex ويرجع أجزاء */
  function split(text, re, cls) {
    var parts = [], last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push({ text: text.slice(last, m.index) });
      parts.push({ text: m[0], cls: cls });
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (!parts.length) return null;
    if (last < text.length) parts.push({ text: text.slice(last) });
    return parts;
  }

  /* الأعلام: م1 = ما قبل، م2 = بادئة ملتصقة تبقى بلا لون، م3 = الاسم */
  function splitNames(text, re, cls) {
    var parts = [], last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      var name = m[3];
      if (FORBIDDEN.test(name)) continue;
      var start = m.index + m[1].length + m[2].length;
      if (start > last) parts.push({ text: text.slice(last, start) });
      parts.push({ text: name, cls: cls });
      last = start + name.length;
    }
    if (!parts.length) return null;
    if (last < text.length) parts.push({ text: text.slice(last) });
    return parts;
  }

  function collectTextNodes(root) {
    var out = [];
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = w.nextNode())) {
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      if (shouldSkip(n)) continue;
      out.push(n);
    }
    return out;
  }

  /* ============ 3. التطبيق ============ */

  var running = false;

  function pass(root, re, cls, splitter) {
    var nodes = collectTextNodes(root);
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].nodeValue;
      var parts = splitter(t, re, cls);
      if (parts) replaceNode(nodes[i], parts);
    }
  }

  function apply(root) {
    if (running) return;
    running = true;
    try {
      /* الترتيب يفرض الأولوية (بند 5-ب/2): آية ← حديث ← اسم.
         بعد تغليف الآية بـ .sem-aya يستثنيها SKIP_CLOSEST من الجولات التالية،
         فيبقى الاسم داخل الآية أخضر ولا يُلوَّن بالأحمر. */
      pass(root, RE_AYA, 'sem-aya', split);
      pass(root, RE_HADITH, 'sem-hadith', split);
      pass(root, RE_SCHOLAR, 'sem-name sem-scholar', splitNames);
      pass(root, RE_FIGURE, 'sem-name', splitNames);
    } catch (e) {
      /* الطبقة تجميلية: أي خطأ لا يجوز أن يعطّل الصفحة */
      if (window.console) console.warn('ilm-semantic:', e);
    }
    running = false;
  }

  function zone() {
    return document.querySelector('[data-ilm-highlight-zone]') || document.body;
  }

  var timer = null;
  function schedule(root) {
    clearTimeout(timer);
    timer = setTimeout(function () { apply(root); }, 60);
  }

  function start() {
    var root = zone();
    apply(root);

    /* ilm-highlight.js يكتب innerHTML فوق الفقرات المظلَّلة بعد جلبها من السحابة،
       فيمحو التلوين. المراقب يعيد تطبيقه على ما تغيّر. */
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function (muts) {
      if (running) return;
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) { schedule(root); return; }
      }
    });
    obs.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  } else {
    setTimeout(start, 0);
  }
})();
