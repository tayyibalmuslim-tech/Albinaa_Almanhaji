/* ilm-notes-toggle.js — زرّ «إخفاء كل الهوامش» (آلية العمل 5.3، بند 6-ج)
 *
 * كل علامة هامش في المتن قرارٌ يُفرض على القارئ: أقرأ الآن أم أُكمل؟
 * وكلفة القرار نفسه أعلى من كلفة قراءة الهامش. هذا الزر يتيح قراءتين:
 * أولى متدفقة بلا مقاطعة، وثانية عميقة بالهوامش.
 *
 * لا يمسّ النص ولا عدد البلوكات، فلا يُبطل تظليلًا. (بند 12-ب)
 */
(function () {
  'use strict';

  var KEY = 'ilm-notes-off';
  var CSS =
    '.ilm-notes-off .note,.ilm-notes-off aside.note{display:none!important}' +
    '.ilm-notes-off .nref,.ilm-notes-off .nmark,.ilm-notes-off sup.ref{' +
      'opacity:.28;pointer-events:none}' +
    '#ilm-notes-btn{position:fixed;inset-block-end:18px;inset-inline-start:18px;z-index:9990;' +
      'font:600 13px/1 system-ui,"Segoe UI",Tahoma,sans-serif;' +
      'padding:10px 14px;min-height:44px;border-radius:999px;cursor:pointer;' +
      'border:1px solid currentColor;background:Canvas;color:CanvasText;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.16);opacity:.82;transition:opacity .2s}' +
    '#ilm-notes-btn:hover,#ilm-notes-btn:focus-visible{opacity:1}' +
    '#ilm-notes-btn:focus-visible{outline:2px solid currentColor;outline-offset:2px}' +
    '@media print{#ilm-notes-btn{display:none!important}' +
      '.ilm-notes-off .note{display:block!important}}';

  function hasNotes() {
    return !!document.querySelector('.note, aside.note');
  }

  function read() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* يتعطّل بهدوء */ }
  }

  function init() {
    if (!hasNotes()) return;

    var st = document.createElement('style');
    st.id = 'ilm-notes-css';
    st.textContent = CSS;
    document.head.appendChild(st);

    var btn = document.createElement('button');
    btn.id = 'ilm-notes-btn';
    btn.type = 'button';

    function paint() {
      var off = document.body.classList.contains(KEY);
      btn.textContent = off ? '❐ إظهار الهوامش' : '✕ إخفاء الهوامش';
      btn.setAttribute('aria-pressed', off ? 'true' : 'false');
      btn.title = off
        ? 'إظهار الهوامش الجانبية مرة أخرى'
        : 'إخفاء كل الهوامش لقراءة متدفقة بلا مقاطعة';
    }

    if (read()) document.body.classList.add(KEY);
    paint();

    btn.addEventListener('click', function () {
      var off = document.body.classList.toggle(KEY);
      write(off);
      paint();
    });

    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
