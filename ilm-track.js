/* =========================================================
   ilm-track.js
   وحدة تتبّع إتمام محاضرة واحدة — للصفحات ذات التصميم المستقل
   (التي لا تحمّل data.js/script.js الكاملين بنظام SITE_DATA)

   توفّر: window.IlmTrack.isDone(id) / setDone(id, val)
   تستخدم نفس مفاتيح التخزين المحلي (ilm_*) ونفس منطق المزامنة
   السحابية المستخدم في script.js، بحيث تبقى كل صفحات الموقع
   متسقة ومتصلة ببعضها البعض بغض النظر عن تصميمها الخاص.

   طريقة الإضافة (بعد data-lecture-id على <body> أو أي عنصر):
   <script src="[المسار]/ilm-track.js"></script>
   ========================================================= */
(function () {
  'use strict';

  var PREFIX = 'ilm_';
  var LOG_KEY = PREFIX + 'activity_log';
  var TS_KEY = PREFIX + 'sync_ts';

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function recordActivity() {
    var log = [];
    try { log = JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { log = []; }
    var t = todayStr();
    if (log.indexOf(t) === -1) {
      log.push(t);
      try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) {}
    }
  }

  function isDone(id) {
    return localStorage.getItem(PREFIX + id) === '1';
  }

  function collectSnapshot() {
    var out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0 && k !== LOG_KEY && k !== TS_KEY) {
        out[k.slice(PREFIX.length)] = localStorage.getItem(k);
      }
    }
    return out;
  }

  function getLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { return []; }
  }

  function pushToCloud(ts) {
    if (window.ManhajCloud && window.ManhajCloud.user) {
      window.ManhajCloud.saveProgress({ lectures: collectSnapshot(), activityLog: getLog() }, ts);
    }
  }

  function setDone(id, val) {
    var wasDone = isDone(id);
    localStorage.setItem(PREFIX + id, val ? '1' : '0');
    if (val && !wasDone) recordActivity();
    var ts = Date.now();
    try { localStorage.setItem(TS_KEY, String(ts)); } catch (e) {}
    pushToCloud(ts);
    return { justCompleted: val && !wasDone };
  }

  // عند تحميل الصفحة: لو فيه دخول سحابي، نطبّق منطق "الأحدث يفوز" مرة واحدة
  // (نفس منطق syncFromCloudOnce في script.js، لكن مصغّر لصفحة واحدة)
  async function syncOnce() {
    if (!window.ManhajCloud) return;
    try { await window.ManhajCloud.ready; } catch (e) { return; }
    var cloud = null;
    try { cloud = await window.ManhajCloud.loadProgress(); } catch (e) { cloud = null; }
    if (!cloud) { pushToCloud(Date.now()); return; }

    var cloudTs = cloud.ts || 0;
    var localTs = parseInt(localStorage.getItem(TS_KEY) || '0', 10);

    if (cloudTs > localTs) {
      var lectures = cloud.lectures || {};
      Object.keys(lectures).forEach(function (id) {
        localStorage.setItem(PREFIX + id, lectures[id]);
      });
      if (Array.isArray(cloud.activityLog)) {
        localStorage.setItem(LOG_KEY, JSON.stringify(cloud.activityLog));
      }
      try { localStorage.setItem(TS_KEY, String(cloudTs)); } catch (e) {}
      window.dispatchEvent(new CustomEvent('ilm-track-synced'));
    } else if (localTs > cloudTs) {
      pushToCloud(localTs);
    }
  }

  window.IlmTrack = { isDone: isDone, setDone: setDone, ready: syncOnce() };
})();
