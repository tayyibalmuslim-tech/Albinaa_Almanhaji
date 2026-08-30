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

  /* أنبياء ورسل ← أحمر + عريض (بطلب صريح من مازن، إضافة إلى بند 5-ب).
     مقسَّمون فئتين بعد مراجعة فعلية لكل حالة في ملفات المشروع (لا تخمين):

     PROPHETS_SAFE: نادرًا ما يشترك اسمها مع عالِم/راوٍ مشهور، فيكفيها
     الاستبعاد العام (بند أ أدناه: سورة/نسب/رقم آية).

     PROPHETS_GATED: أسماء اتضح من القراءة الفعلية أنها في الغالب ليست
     أنبياء في هذا المشروع تحديدًا: «يحيى» و«سليمان» و«داود» و«إسحاق»
     كانت 0% أو تكاد نبيًّا (كلها رواة حديث وفقهاء: يحيى بن معين،
     سليمان بن يسار، داود الظاهري، إسحاق بن راهويه)، و«يوسف»/«هارون»
     غالبها كذلك (يوسف الغفيص، أبو يوسف، هارون الرشيد)، و«محمد» أغلبها
     جزء من اسم عالم (محمد الطاهر بن عاشور، محمد بن الحسن). فهذه الفئة
     لا تُلوَّن إلا حيث تصرّح قرينة نبوة قريبة (بند ب أدناه). */
  var PROPHETS_SAFE = [
    'إبراهيم', 'إسماعيل', 'يعقوب', 'عيسى', 'زكريا', 'نوح', 'هود',
    'شعيب', 'لوط', 'أيوب', 'إدريس', 'ذو الكفل', 'اليسع', 'آدم', 'موسى'
  ];
  var PROPHETS_GATED = [
    'يحيى', 'سليمان', 'داود', 'إسحاق', 'يوسف', 'هارون', 'يونس', 'محمد'
  ];

  /* شخصيات أخرى مذكورة بالاسم (غير أنبياء وغير علماء) ← أحمر بلا تعريض.
     ملاحظة: فرعون والنمرود وهامان وأبو لهب وأبو جهل وأبو سفيان وقارون
     ليسوا أنبياء ولا صحابة، فلا يُعرَّضون رغم كونهم أعلامًا. */
  var FIGURES = [
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
  var DIAC = '\u064B-\u065F\u0670';           // تشكيل يُتجاوز عند فحص السياق
  var AR_OR_DIAC = AR + DIAC;

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
  var RE_PROPHET_SAFE = nameRe(PROPHETS_SAFE);
  var RE_PROPHET_GATED = nameRe(PROPHETS_GATED);
  var RE_FIGURE = nameRe(FIGURES);
  /* القوس القرآني وحده لا يُستعمل لغير الآية، فالتقاطه آمن. */
  var RE_AYA = /﴿[\s\S]*?﴾/g;

  /* ===== فحوص السياق (بند 5-ب/3: عند الالتباس لا تُلوَّن) =====
     ثبتت الحاجة إليها من قراءة فعلية لكل حالة تلوين في ملفات المشروع،
     لا من التخمين — راجع سجل التغيير في آلية العمل 5.4. */

  /* أ) استبعاد عام يسري على كل الأعلام مهما كانت فئتها:
        - «سورة يونس»، «سورة هود»، «سورة مريم»: اسم سورة لا شخص.
        - «يحيى بن معين»، «بن سليمان»، «أبو داود»: نسب أو كنية لشخص آخر.
        - «هود ١٠٦»، «يونس ٩٠»: رقم آية بعد اسم السورة في التوثيق. */
  var CTX_BEFORE_BLOCK = /(?:سورة|بن|ابن|أبو|أبي)[\s\u064B-\u065F]{0,3}$/;
  var CTX_AFTER_BLOCK = /^[\s\u064B-\u065F]{0,3}(?:بن\b|[٠-٩])/;

  /* ب) شرط إضافي لفئة PROPHETS_GATED فقط: لا يُلوَّن الاسم إلا بقرينة
        نبوة صريحة قريبة، قبله أو بعده. */
  var CTX_PROPHET_AFTER = /^[\s\u064B-\u065F]{0,3}(?:عليه السلام|عليهما السلام|عليهم السلام|صلى الله عليه وسلم|ﷺ)/;
  var CTX_PROPHET_BEFORE = /(?:نبي الله|نبيّ الله|نبيه|نبيّه|نبينا|نبيّنا|رسول الله)[\s\u064B-\u065F]{0,3}$/;

  function contextOk(before, after, gated) {
    if (CTX_BEFORE_BLOCK.test(before)) return false;
    if (CTX_AFTER_BLOCK.test(after)) return false;
    if (!gated) return true;
    return CTX_PROPHET_AFTER.test(after) || CTX_PROPHET_BEFORE.test(before);
  }

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

  /* الأعلام: م1 = ما قبل، م2 = بادئة ملتصقة تبقى بلا لون، م3 = الاسم.
     gated=true يفرض شرط قرينة النبوة (فحص ب) إضافة إلى الاستبعاد العام. */
  function splitNames(text, re, cls, gated) {
    var parts = [], last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      var name = m[3];
      if (FORBIDDEN.test(name)) continue;
      var start = m.index + m[1].length + m[2].length;
      var before = text.slice(Math.max(0, m.index - 20), m.index + m[1].length);
      var after = text.slice(start + name.length, start + name.length + 30);
      if (!contextOk(before, after, gated)) continue;
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

  /* «…» لا يدلّ على الحديث، لا في الكتب ولا في المحاضرات.
     الإحصاء الفعلي على كتب المرحلة الأولى: من 431 استعمالًا، 45 فقط حديث (10%).
     والباقي أسماء كتب ومصطلحات (359)، ونقول عن مفسّرين (17)،
     وأقوال شخصيات — منها قول النمرود «أنا أُحيي وأميت» (10).
     فتلوين ما بين القوسين بلون الحديث يجعل قول الكافر المحتجَّ عليه
     في صورة كلام النبي ﷺ، وهو أفدح ما يقع فيه التلوين الدلالي.
     لذلك: لا يُلوَّن الحديث إلا حيث نصّ بانى الملف عليه بالكلاس .hadith،
     ويتولّى ذلك الـCSS. (بند 5-ب/3: عند الالتباس لا تلوّن) */

  var running = false;

  function pass(root, re, cls, splitter, gated) {
    var nodes = collectTextNodes(root);
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].nodeValue;
      var parts = splitter(t, re, cls, gated);
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
      pass(root, RE_SCHOLAR, 'sem-name sem-scholar', splitNames, false);
      pass(root, RE_PROPHET_SAFE, 'sem-name sem-scholar', splitNames, false);
      pass(root, RE_PROPHET_GATED, 'sem-name sem-scholar', splitNames, true);
      pass(root, RE_FIGURE, 'sem-name', splitNames, false);
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
