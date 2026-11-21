/*!
 * ilm-anki.js — المولّد والمصدِّر الموحّد لبطاقات Anki
 * مشروع «البناء المنهجي» والسلاسل المستقلة (مثل «العروة الوثقى»)
 * مرجع القواعد: آلية العمل 5.11 — البند 9-ط و9-ص
 *
 * هذا الملف هو المصدر الوحيد لـ: شكل البطاقة (HTML) + الوسوم + الرزمة + GUID + أسطر الاستيراد.
 * لا يُكتب في صفحة المحاضرة أي كود تصدير أو وسم يدوي. أي تعديل يتم هنا فقط.
 *
 * الاستعمال في صفحة محاضرة من البناء المنهجي:
 *   <script src="../../../data.js"></script>
 *   <script src="../../../ilm-anki.js" data-lecture="02"></script>
 * وفي سلسلة مستقلة (بلا data.js):
 *   <script src="ilm-anki.js" data-series="العروة الوثقى" data-lecture="01"></script>
 * ثم في سكريبت الصفحة:  ILM_ANKI.download(CARDS_DATA)   أو   ILM_ANKI.front(c) / ILM_ANKI.back(c)
 */
(function (root) {
  "use strict";
  var VERSION = "1.0.0";

  /* ================= الإعدادات المركزية (تُعدَّل هنا فقط) ================= */
  var DECK_ROOT = "فوائد::🔴🔴🔴";
  var PRIORITY_DECKS = {
    1: "1 الأطروحة والأقسام الكبرى",
    2: "2 القواعد والتعريفات",
    3: "3 الأدلة ووجه الدلالة",
    4: "4 الفروق والالتباسات",
    5: "5 القصص والعبر",
    6: "6 الأعلام والتواريخ والكتب"
  };
  var PRIORITY_TAG = "أولوية_";
  var LABELS = {
    def: "التعريف", excl: "ما يخرج عن التعريف", ans: "الإجابة", wajh: "وجه الدلالة والمقصد",
    alert: "تنبيه مهم", rule: "القاعدة", exc: "الاستثناء", err: "الخطأ المنهجي", ruling: "الحكم",
    edit: "إضافة تحريرية"
  };
  var PLABEL = { calm: "السؤال", quran: "السؤال", compare: "مقارنة", method: "قاعدة منهجية" };
  var CLS = { sahabi: "sem-name sem-sahabi", scholar: "sem-name sem-scholar", name: "sem-name", hadith: "sem-hadith", focus: "mz-focus" };

  /* ================= قراءة بيانات الصفحة ================= */
  var ATTR = {};
  if (typeof document !== "undefined" && document.currentScript) {
    ATTR = document.currentScript.dataset || {};
  }
  var CFG = { siteData: null, lectureId: null, lecture: ATTR.lecture || null, series: ATTR.series || null, href: null, names: null };

  function configure(o) { Object.keys(o || {}).forEach(function (k) { CFG[k] = o[k]; }); NAME_RE = undefined; META = null; return api; }

  function tagPart(s) {
    return String(s || "").replace(/\([^)]*\)/g, "").replace(/:+/g, " ").trim().replace(/\s+/g, "_").replace(/_+/g, "_");
  }
  function pad2(n) { n = String(n || "").replace(/\D/g, ""); return n.length === 1 ? "0" + n : n; }

  var META = null;
  function meta() {
    if (META) return META;
    var doc = typeof document !== "undefined" ? document : null;
    var lectureId = CFG.lectureId || (doc && (doc.querySelector("[data-lecture-id]") || {}).getAttribute && doc.querySelector("[data-lecture-id]").getAttribute("data-lecture-id"));
    var lec = pad2(CFG.lecture);
    if (!lectureId) throw new Error("ilm-anki: لا يوجد data-lecture-id في الصفحة");
    if (!lec) throw new Error("ilm-anki: data-lecture (رقم المحاضرة في المادة) مطلوب على وسم السكريبت");
    var sd = CFG.siteData || (typeof SITE_DATA !== "undefined" ? SITE_DATA : (root.SITE_DATA || null));
    var m = { lectureId: lectureId, lecture: lec, version: VERSION };
    if (CFG.series) {
      m.kind = "series";
      m.title = CFG.series;
      m.subject = CFG.series;
      m.path = [tagPart(CFG.series), "محاضرة_" + lec];
      m.deckBase = DECK_ROOT + "::" + CFG.series;
    } else {
      if (!sd) throw new Error("ilm-anki: لا data.js ولا data-series — لا يمكن تحديد مسار الوسم");
      var found = null;
      Object.keys(sd.stages || {}).forEach(function (sk) {
        var st = sd.stages[sk];
        (st.subjects || []).forEach(function (sub) {
          var hit = (sub.lectures || []).some(function (l) { return l.id === lectureId; });
          var pre = lectureId.indexOf(sk + "_" + sub.key + "_") === 0;
          if (hit || (pre && !found)) found = { st: st, sub: sub };
        });
      });
      if (!found) throw new Error("ilm-anki: المعرّف " + lectureId + " غير موجود في data.js");
      var prog = (sd.anki && sd.anki.program) || "البناء المنهجي";
      var level = found.st.level || (sd.anki && sd.anki.level) || "";
      m.kind = "program";
      m.title = prog;
      m.subject = found.sub.name;
      m.path = [tagPart(prog)].concat(level ? [tagPart(level)] : [], [tagPart(found.st.name), tagPart(found.sub.ankiName || found.sub.name), "محاضرة_" + lec]);
      m.deckBase = DECK_ROOT + "::" + ((sd.anki && sd.anki.deck) || prog);
    }
    m.tag = m.path.join("::");
    META = m;
    return m;
  }

  /* ================= المولّد (9-ط) — لا يغيّر حرفًا من q/a ================= */
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  var NAME_RE;
  function nameRe() {
    if (NAME_RE !== undefined) return NAME_RE;
    var names = CFG.names || root.ANKI_NAMES || null, all = [];
    if (names) Object.keys(names).forEach(function (k) { names[k].forEach(function (n) { all.push([n, k]); }); });
    if (!all.length) return (NAME_RE = null);
    all.sort(function (a, b) { return b[0].length - a[0].length; });
    NAME_RE = { re: new RegExp("(^|[^\\u0621-\\u064A])([وفبل]?)(" + all.map(function (x) { return reEsc(esc(x[0])); }).join("|") + ")(?![\\u0621-\\u064A])", "g"),
      map: all.reduce(function (o, x) { o[esc(x[0])] = x[1]; return o; }, {}) };
    return NAME_RE;
  }
  function colorize(txt, marks, inQ) {
    var parts = [], re = /﴿[^﴾]*﴾/g, last = 0, m;
    while ((m = re.exec(txt))) { parts.push([0, txt.slice(last, m.index)]); parts.push([1, m[0]]); last = m.index + m[0].length; }
    parts.push([0, txt.slice(last)]);
    var NR = nameRe();
    return parts.map(function (p) {
      if (p[1] === "") return "";
      if (p[0] === 1) return '<span class="sem-aya' + (inQ ? " mz-v" : "") + '">' + esc(p[1]) + "</span>";
      var s = esc(p[1]), held = [];
      (marks || []).forEach(function (mk) {
        var e = esc(mk.w);
        if (CLS[mk.t] && s.indexOf(e) > -1) { s = s.split(e).join("\u0001" + held.length + "\u0002"); held.push('<span class="' + CLS[mk.t] + '">' + e + "</span>"); }
      });
      if (NR) s = s.replace(NR.re, function (all, pre, cj, n) { return pre + cj + '<span class="' + CLS[NR.map[n]] + '">' + n + "</span>"; });
      return s.replace(/\u0001(\d+)\u0002/g, function (a, i) { return held[+i]; });
    }).join("");
  }
  function slice(a, cur, s, e) {
    var i = a.indexOf(s, cur); if (i < 0) throw new Error("ilm-anki: بداية البلوك غير موجودة: " + s);
    var j = a.indexOf(e, i); if (j < 0) throw new Error("ilm-anki: نهاية البلوك غير موجودة: " + e);
    return [i, j + e.length];
  }
  function front(c) {
    var M = meta();
    var lines = String(c.q).split("\n").map(function (l) {
      return '<p class="mz-qt' + (l.indexOf("﴿") > -1 ? " mz-sh" : "") + '">' + colorize(l, c.marks, true) + "</p>";
    }).join("");
    return '<div class="mz-face mz-' + c.pattern + '"><header class="mz-head"><span class="mz-subject"><span class="mz-ico"></span>' + esc(M.subject) +
      '</span><span class="mz-kicker">المحاضرة ' + M.lecture + '</span></header><div class="mz-label">' + (PLABEL[c.pattern] || "السؤال") +
      '</div><div class="mz-q">' + lines + "</div></div>";
  }
  function box(type, txt, b, c) {
    var inner = colorize(txt, c.marks);
    if (b.lead) {
      var L = colorize(b.lead, c.marks);
      if (inner.indexOf(L) === 0) inner = '<span class="mz-corelead">' + L + "</span>" + inner.slice(L.length);
    }
    return '<div class="mz-box mz-b-' + type + (b.nolabel ? " mz-b-nolabel" : "") + (b.core ? " mz-core" : "") + '" data-label="' + LABELS[type] + '">' + inner + "</div>";
  }
  function back(c) {
    var a = c.a, cur = 0, out = "";
    (c.blocks || [{ type: "ans", all: true }]).forEach(function (b) {
      if (b.all) { out += box(b.type, a, b, c); cur = a.length; return; }
      if (b.type === "cols") {
        out += '<div class="mz-cols">' + b.parts.map(function (p, k) { var r = slice(a, cur, p.s, p.e); cur = r[1];
          return '<div class="mz-col mz-col' + (k + 1) + '" data-label="' + (k ? "الطرف الثاني" : "الطرف الأول") + '">' + colorize(a.slice(r[0], r[1]), c.marks) + "</div>"; }).join("") + "</div>";
      } else if (b.type === "steps") {
        out += '<div class="mz-steps mz-steps-list">' + b.items.map(function (it, k) {
          var r = slice(a, cur, it.s, it.e); cur = r[1]; var t = a.slice(r[0], r[1]), d = "";
          if (it.ds) { var r2 = slice(a, cur, it.ds, it.de); cur = r2[1]; d = '<div class="mz-step-d">' + colorize(a.slice(r2[0], r2[1]), c.marks) + "</div>"; }
          return (k && b.seq ? '<div class="mz-arrow" aria-hidden="true"></div>' : "") + '<div class="mz-step"><span class="mz-step-n"></span><div class="mz-step-b"><div class="mz-step-t">' + colorize(t, c.marks) + "</div>" + d + "</div></div>";
        }).join("") + "</div>";
      } else {
        var r = slice(a, cur, b.s, b.e); cur = r[1];
        out += box(b.type, a.slice(r[0], r[1]), b, c);
      }
    });
    var href = CFG.href || (typeof location !== "undefined" && /^https?:/.test(location.protocol) ? location.href.split("#")[0].split("?")[0] : null);
    if (href && c.sectionId) out += '<div class="mz-srcl"><a href="' + esc(href) + "#" + esc(c.sectionId) + '">المصدر</a></div>';
    return '<div class="mz-ans mz-' + c.pattern + '">' + out + "</div>";
  }

  /* ================= الوسوم والرزمة وGUID ================= */
  function guid(c) { return meta().lectureId + "_" + c.id; }
  function priority(c) { var p = +c.level; if (!(p >= 1 && p <= 6)) throw new Error("ilm-anki: أولوية البطاقة " + c.id + " ليست من 1 إلى 6"); return p; }
  function tags(c) { return meta().tag + " " + PRIORITY_TAG + priority(c); }
  function deck(c) { return meta().deckBase + "::" + PRIORITY_DECKS[priority(c)]; }

  function validate(cards) {
    var seen = {}, problems = [];
    cards.forEach(function (c) {
      if (!c.id) problems.push("بطاقة بلا id");
      else if (seen[c.id]) problems.push("id مكرر: " + c.id); else seen[c.id] = 1;
      try { priority(c); } catch (e) { problems.push(e.message); }
      if (!c.src) problems.push("بلا src (9-ل-ب): " + c.id);
    });
    return problems;
  }

  function cell(x) { return String(x).replace(/[\t\r\n]+/g, " "); }
  function tsv(cards) {
    var probs = validate(cards).filter(function (p) { return p.indexOf("بلا src") < 0; });
    if (probs.length) throw new Error("ilm-anki: " + probs.join(" | "));
    var head = ["#separator:tab", "#html:true", "#guid column:1", "#deck column:4", "#tags column:5"];
    return head.concat(cards.map(function (c) {
      return [guid(c), front(c), back(c), deck(c), tags(c)].map(cell).join("\t");
    })).join("\n");
  }
  function fileName() { var M = meta(); return M.path.slice(-2).join("_") + "_بطاقات.tsv"; }
  function download(cards) {
    var blob = new Blob([tsv(cards)], { type: "text/tab-separated-values;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fileName();
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  var api = { VERSION: VERSION, configure: configure, meta: meta, front: front, back: back, guid: guid, tags: tags, deck: deck,
    validate: validate, tsv: tsv, download: download, fileName: fileName, PRIORITY_DECKS: PRIORITY_DECKS, tagPart: tagPart };
  root.ILM_ANKI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
