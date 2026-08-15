// =========================================================
// نظام التتبع والإنجاز - منهجي في طلب العلم
// يعتمد على البيانات الموجودة في data.js (SITE_DATA)
// =========================================================

const STORAGE_PREFIX = 'ilm_';
const LOG_KEY = STORAGE_PREFIX + 'activity_log';

/* ---------------- Storage helpers ---------------- */
function isDone(id) {
  return localStorage.getItem(STORAGE_PREFIX + id) === '1';
}
function setDone(id, val) {
  const wasDone = isDone(id);
  localStorage.setItem(STORAGE_PREFIX + id, val ? '1' : '0');
  if (val && !wasDone) recordActivity();
  return { justCompleted: val && !wasDone };
}

/* ---------------- سجل النشاط اليومي (للسلسلة/Streak) ---------------- */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function recordActivity() {
  let log = [];
  try { log = JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { log = []; }
  const t = todayStr();
  if (!log.includes(t)) {
    log.push(t);
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  }
}
function computeStreak() {
  let log = [];
  try { log = JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { log = []; }
  if (!log.length) return 0;
  const set = new Set(log);
  let streak = 0;
  let cursor = new Date();
  // إذا لم يُنجز شيء اليوم، تحقق من الأمس كبداية للسلسلة
  if (!set.has(todayStr())) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (set.has(key)) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return streak;
}

/* ---------------- Data helpers ---------------- */
function getStage(stageId) {
  return SITE_DATA.stages[stageId];
}
function getSubject(stageId, subjectKey) {
  const stage = getStage(stageId);
  if (!stage) return null;
  return stage.subjects.find(s => s.key === subjectKey) || null;
}

function subjectProgress(stageId, subjectKey) {
  const subject = getSubject(stageId, subjectKey);
  if (!subject) return { done: 0, total: 0 };
  const total = subject.lectures.length;
  const done = subject.lectures.filter(l => isDone(l.id)).length;
  return { done, total };
}

function stageProgress(stageId) {
  const stage = getStage(stageId);
  if (!stage) return { done: 0, total: 0 };
  let done = 0, total = 0;
  stage.subjects.forEach(s => {
    total += s.lectures.length;
    done += s.lectures.filter(l => isDone(l.id)).length;
  });
  return { done, total };
}

function globalProgress() {
  let done = 0, total = 0;
  Object.keys(SITE_DATA.stages).forEach(stageId => {
    const p = stageProgress(stageId);
    done += p.done;
    total += p.total;
  });
  return { done, total };
}

function pct(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

/* ---------------- Small render helpers ---------------- */
function progressBarHtml(done, total, extraLabel) {
  const p = pct(done, total);
  return `
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${p}%"></div></div>
    <div class="progress-text"><span>${extraLabel || ''}</span><span>${done} / ${total} — ${p}%</span></div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ---------------- إيجاد المحاضرة التالية غير المكتملة ---------------- */
function findNextLecture(stageId) {
  const stage = getStage(stageId);
  if (!stage) return null;
  const lectureDays = stage.days.filter(d => d.kind === 'lecture').sort((a, b) => a.day - b.day);
  const next = lectureDays.find(d => !isDone(d.lectureId));
  return next || null;
}

/* ---------------- شريط تنبيه عائم (تعزيز إيجابي) ---------------- */
function showToast(message) {
  let holder = document.getElementById('toast-holder');
  if (!holder) {
    holder = document.createElement('div');
    holder.id = 'toast-holder';
    holder.className = 'toast-holder';
    document.body.appendChild(holder);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  holder.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2400);
}

const ENCOURAGEMENTS = ['أحسنت! 🌿', 'واصل، أنت تتقدّم 💪', 'خطوة أخرى نحو الهدف ✨', 'بارك الله فيك 🌙', 'استمر، النور قريب ✦'];
function randomEncouragement() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

/* ---------------- بطاقة "أكمل من هنا" ---------------- */
function continueCardHtml(stageId, compact) {
  const next = findNextLecture(stageId);
  const stage = getStage(stageId);
  if (!next) {
    if (!stage) return '';
    return `
      <div class="continue-card done">
        <div class="continue-icon">🌟</div>
        <div class="continue-body">
          <div class="continue-eyebrow">تهانينا</div>
          <div class="continue-title">أتممت جميع محاضرات ${escapeHtml(stage.name)}!</div>
        </div>
      </div>`;
  }
  const href = compact ? next.link : `stage-1/${next.link}`;
  return `
    <div class="continue-card">
      <div class="continue-icon">📖</div>
      <div class="continue-body">
        <div class="continue-eyebrow">أكمل من هنا — اليوم ${next.day}</div>
        <div class="continue-title">${escapeHtml(next.title)}</div>
        <div class="continue-sub">${escapeHtml(next.subjectName)}</div>
      </div>
      <a class="btn continue-btn" href="${href}">ابدأ الآن</a>
    </div>`;
}

/* =========================================================
   صفحة الرئيسية (home)
   ========================================================= */
function renderHome() {
  // إحصائيات عامة
  const gp = globalProgress();
  let totalSubjects = 0;
  Object.values(SITE_DATA.stages).forEach(st => totalSubjects += st.subjects.length);
  const streak = computeStreak();

  const statsEl = document.getElementById('global-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-box highlight"><div class="stat-value">${streak} 🔥</div><div class="stat-label">أيام متتالية</div></div>
      <div class="stat-box"><div class="stat-value">${totalSubjects}</div><div class="stat-label">إجمالي المواد</div></div>
      <div class="stat-box"><div class="stat-value">${gp.done} / ${gp.total}</div><div class="stat-label">محاضرات مكتملة</div></div>
      <div class="stat-box"><div class="stat-value">${pct(gp.done, gp.total)}%</div><div class="stat-label">نسبة الإنجاز الكلية</div></div>
    `;
  }

  const continueEl = document.getElementById('continue-card');
  if (continueEl) {
    if (SITE_DATA.stages['stage1']) {
      continueEl.innerHTML = continueCardHtml('stage1', false);
    } else {
      continueEl.innerHTML = '';
    }
  }

  // بطاقات المراحل
  const grid = document.getElementById('stages-grid');
  if (grid) {
    const allStageNums = [1, 2, 3, 4];
    const stageNames = { 1: 'المرحلة الأولى', 2: 'المرحلة الثانية', 3: 'المرحلة الثالثة', 4: 'المرحلة الرابعة' };
    grid.innerHTML = allStageNums.map(num => {
      const stageId = 'stage' + num;
      const stage = SITE_DATA.stages[stageId];
      if (!stage) {
        return `
          <div class="card stage-card disabled">
            <h3>${stageNames[num]}</h3>
            <p class="stage-meta">قريبًا 🚧 — لم تتم إضافة المحتوى بعد</p>
            <div class="card-footer">
              <a class="btn btn-outline btn-sm" href="stage-${num}/index.html">عرض الصفحة</a>
            </div>
          </div>`;
      }
      const sp = stageProgress(stageId);
      const completedSubjects = stage.subjects.filter(s => {
        const p = subjectProgress(stageId, s.key);
        return p.total > 0 && p.done === p.total;
      }).length;
      return `
        <div class="card stage-card">
          <h3>${stage.name}</h3>
          <div class="stage-meta">المواد المكتملة: ${completedSubjects} / ${stage.subjects.length}</div>
          ${progressBarHtml(sp.done, sp.total, 'إنجاز المرحلة')}
          <div class="card-footer">
            <a class="btn btn-sm" href="stage-${num}/index.html">دخول المرحلة</a>
          </div>
        </div>`;
    }).join('');
  }

  setupSearch();
}

function setupSearch() {
  const box = document.getElementById('search-box');
  const resultsEl = document.getElementById('search-results');
  if (!box || !resultsEl) return;

  // فهرسة قابلة للبحث
  const index = [];
  Object.entries(SITE_DATA.stages).forEach(([stageId, stage]) => {
    stage.subjects.forEach(subject => {
      index.push({
        type: 'subject',
        text: [subject.name, subject.sheikh, ...(subject.tags || [])].join(' '),
        title: subject.name,
        meta: `مادة — ${stage.name} — الشيخ ${subject.sheikh}`,
        href: `stage-1/${subject.key}/index.html`
      });
      subject.lectures.forEach(lec => {
        index.push({
          type: 'lecture',
          text: [lec.title, subject.name, subject.sheikh, ...(subject.tags || [])].join(' '),
          title: lec.title,
          meta: `محاضرة — ${subject.name} — اليوم ${lec.day}`,
          href: `stage-1/${subject.key}/${lec.file}`
        });
      });
    });
  });

  box.addEventListener('input', () => {
    const q = box.value.trim().toLowerCase();
    if (!q) { resultsEl.innerHTML = ''; return; }
    const matches = index.filter(item => item.text.toLowerCase().includes(q)).slice(0, 20);
    if (!matches.length) {
      resultsEl.innerHTML = `<div class="search-result-item"><span class="r-meta">لا توجد نتائج مطابقة</span></div>`;
      return;
    }
    resultsEl.innerHTML = matches.map(m => `
      <a class="search-result-item" href="${m.href}">
        <span class="r-title">${escapeHtml(m.title)}</span>
        <span class="r-meta">${escapeHtml(m.meta)}</span>
      </a>
    `).join('');
  });
}

/* =========================================================
   صفحة المرحلة (stage) - تبويبات المواد / الأيام
   ========================================================= */
function renderStagePage() {
  const stageId = document.body.dataset.stageId;
  const stage = getStage(stageId);
  if (!stage) return;

  // رأس الصفحة: تقدم المرحلة
  const headerEl = document.getElementById('stage-progress-header');
  if (headerEl) {
    const sp = stageProgress(stageId);
    const allDone = sp.total > 0 && sp.done === sp.total;
    headerEl.innerHTML = `
      ${progressBarHtml(sp.done, sp.total, 'إنجاز المرحلة')}
      <label class="checkbox-line">
        <input type="checkbox" disabled ${allDone ? 'checked' : ''}>
        <span>إتمام المرحلة (يُحسب تلقائيًا من إتمام جميع المحاضرات)</span>
      </label>
    `;
  }

  const continueEl = document.querySelector(`#stage-continue-card[data-stage="${stageId}"]`);
  if (continueEl) continueEl.innerHTML = continueCardHtml(stageId, true);

  // تبويب المواد
  const subjectsEl = document.querySelector(`[data-stage-subjects="${stageId}"]`);
  if (subjectsEl) {
    subjectsEl.innerHTML = stage.subjects.map(s => {
      const p = subjectProgress(stageId, s.key);
      const done = p.total > 0 && p.done === p.total;
      const tagsHtml = (s.tags || []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(' ');
      return `
        <div class="card subject-card ${done ? 'is-complete' : ''}">
          <div class="subject-card-top">
            <div>
              <h3>${escapeHtml(s.name)}</h3>
              <div class="subject-sub">الشيخ: ${escapeHtml(s.sheikh)}</div>
              <div class="tags">${tagsHtml}</div>
            </div>
            <label class="checkbox-line" title="يُحسب تلقائيًا من إتمام محاضرات المادة">
              <input type="checkbox" disabled ${done ? 'checked' : ''}>
            </label>
          </div>
          ${progressBarHtml(p.done, p.total, `${p.done} من ${p.total} محاضرة`)}
          <div class="card-footer">
            <a class="btn btn-sm" href="${s.key}/index.html">دخول المادة</a>
          </div>
        </div>
      `;
    }).join('');
  }

  // تبويب الأيام
  const daysEl = document.querySelector(`[data-stage-days="${stageId}"]`);
  if (daysEl) {
    daysEl.innerHTML = `<ul class="days-list">` + stage.days.map(d => {
      if (d.kind === 'lecture') {
        const done = isDone(d.lectureId);
        const checked = done ? 'checked' : '';
        return `
          <li class="day-item ${done ? 'is-done' : ''}">
            <div class="day-item-main">
              <span class="day-num">اليوم ${d.day}</span>
              <div>
                <a class="day-title" href="${escapeHtml(d.link)}">${escapeHtml(d.title)}</a>
                <div class="day-subject">${escapeHtml(d.subjectName)}</div>
              </div>
            </div>
            <label class="checkbox-line">
              <input type="checkbox" data-lecture-id="${d.lectureId}" ${checked}>
            </label>
          </li>
        `;
      }
      const dDone = isDone(d.id);
      const checked = dDone ? 'checked' : '';
      const cls = d.kind === 'exam' ? 'exam' : 'rest';
      return `
        <li class="day-item ${cls} ${dDone ? 'is-done' : ''}">
          <div class="day-item-main">
            <span class="day-num">اليوم ${d.day}</span>
            <div class="day-title">${escapeHtml(d.title)}</div>
          </div>
          <label class="checkbox-line">
            <input type="checkbox" data-day-id="${d.id}" ${checked}>
          </label>
        </li>
      `;
    }).join('') + `</ul>`;
  }

  setupTabs();
  wireCheckboxes(renderStagePage);
}

function setupTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  if (!buttons.length) return;
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById('tab-' + btn.dataset.tab);
      if (target) target.classList.add('active');
    }, { once: false });
  });
}

/* =========================================================
   صفحة المادة (subject)
   ========================================================= */
function renderSubjectPage() {
  const stageId = document.body.dataset.stageId;
  const subjectKey = document.body.dataset.subjectKey;
  const subject = getSubject(stageId, subjectKey);
  if (!subject) return;

  const progressEl = document.querySelector(`[data-subject-progress="${stageId}:${subjectKey}"]`);
  if (progressEl) {
    const p = subjectProgress(stageId, subjectKey);
    const done = p.total > 0 && p.done === p.total;
    progressEl.innerHTML = `
      ${progressBarHtml(p.done, p.total)}
      <label class="checkbox-line" title="يُحسب تلقائيًا من إتمام محاضرات المادة">
        <input type="checkbox" disabled ${done ? 'checked' : ''}>
        <span>إتمام المادة (يُحسب تلقائيًا)</span>
      </label>
    `;
  }

  const listEl = document.querySelector(`[data-subject-lectures="${stageId}:${subjectKey}"]`);
  if (listEl) {
    listEl.innerHTML = subject.lectures.map(l => {
      const done = isDone(l.id);
      const checked = done ? 'checked' : '';
      return `
        <li class="lecture-item ${done ? 'is-done' : ''}">
          <div class="lecture-item-main">
            <span class="lecture-num">${l.n}</span>
            <a class="lecture-title" href="${l.file}">${escapeHtml(l.title)}</a>
            <span class="lecture-day-badge">اليوم ${l.day}</span>
          </div>
          <label class="checkbox-line">
            <input type="checkbox" data-lecture-id="${l.id}" ${checked}>
          </label>
        </li>
      `;
    }).join('');
  }

  wireCheckboxes(renderSubjectPage);
}

/* =========================================================
   صفحة المحاضرة (lecture)
   ========================================================= */
function renderLecturePage() {
  const lectureId = document.body.dataset.lectureId;
  const checkbox = document.querySelector(`[data-lecture-id="${lectureId}"]`);
  if (checkbox) checkbox.checked = isDone(lectureId);
  wireCheckboxes(renderLecturePage);
}

/* =========================================================
   ربط أحداث الـ Checkboxes (عام لكل الصفحات)
   ========================================================= */
function wireCheckboxes(rerender) {
  document.querySelectorAll('[data-lecture-id]').forEach(cb => {
    cb.onchange = () => {
      const id = cb.dataset.lectureId;
      // نحدد المادة صاحبة هذه المحاضرة (لمعرفة إن اكتملت بالكامل بعد هذا التحديد)
      let ownerSubject = null, ownerStageId = null;
      Object.entries(SITE_DATA.stages).forEach(([sid, st]) => {
        st.subjects.forEach(s => { if (s.lectures.some(l => l.id === id)) { ownerSubject = s; ownerStageId = sid; } });
      });
      const wasSubjectDone = ownerSubject ? subjectProgress(ownerStageId, ownerSubject.key).done === ownerSubject.lectures.length : false;

      const result = setDone(id, cb.checked);

      if (result.justCompleted) {
        const nowSubjectDone = ownerSubject ? subjectProgress(ownerStageId, ownerSubject.key).done === ownerSubject.lectures.length : false;
        if (ownerSubject && nowSubjectDone && !wasSubjectDone) {
          showToast(`أتممت مادة «${ownerSubject.name}» بالكامل! 🎉`);
        } else {
          showToast(randomEncouragement());
        }
      }
      if (rerender) rerender();
    };
  });
  document.querySelectorAll('[data-day-id]').forEach(cb => {
    cb.onchange = () => {
      setDone(cb.dataset.dayId, cb.checked);
      if (rerender) rerender();
    };
  });
}

/* =========================================================
   نقطة الدخول
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (typeof SITE_DATA === 'undefined') return;

  if (page === 'home') renderHome();
  else if (page === 'stage') renderStagePage();
  else if (page === 'subject') renderSubjectPage();
  else if (page === 'lecture') renderLecturePage();
});
