/* ============================================
   firebase-sync-manhaj.js
   وحدة المصادقة الإجبارية + المزامنة السحابية
   لموقع "منهجي في طلب العلم" — تُضاف لكل الصفحات

   طريقة الإضافة في أي صفحة:
   <script type="module" src="[المسار]/firebase-sync-manhaj.js"></script>

   ماذا تفعل هذه الوحدة؟
   1) تمنع عرض المحتوى قبل تسجيل الدخول (شاشة دخول كاملة)
   2) توفّر واجهة window.ManhajCloud للقراءة/الكتابة من Firestore
   3) تعرض شريحة صغيرة تظهر البريد المسجّل وزر خروج في كل صفحة

   ملحوظة: نفس مشروع Firebase المستخدم في "مصحف التدبر"،
   لكن ببيانات مفصولة تمامًا في مجموعة (collection) خاصة
   بهذا الموقع: manhaj_users/{uid}
   فتسجيل الدخول بنفس الحساب يعمل في الموقعين، دون أي تداخل بيانات.
   ============================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- إعدادات Firebase (نفس مشروع مصحف التدبر) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyD8jxpVrvicStETloL8tk5s865dmNatIqE",
  authDomain: "mazen-productivity-bab1c.firebaseapp.com",
  projectId: "mazen-productivity-bab1c",
  storageBucket: "mazen-productivity-bab1c.firebasestorage.app",
  messagingSenderId: "388570583199",
  appId: "1:388570583199:web:34af7ba9a1b050f12252aa",
  measurementId: "G-WYD2VE2JJQ"
};

/* ---------- الواجهة العامة (متاحة فوراً قبل اكتمال الدخول) ---------- */
let _resolveReady;
const _readyPromise = new Promise((r) => { _resolveReady = r; });

window.ManhajCloud = {
  ready: _readyPromise,   // Promise يكتمل بعد نجاح تسجيل الدخول
  user: null,             // كائن المستخدم الحالي
  loadProgress,           // تحميل كل بيانات التقدم للمستخدم
  saveProgress,           // حفظ كل بيانات التقدم (مؤجَّل تلقائياً)
  loadHighlights,         // تحميل هايلايت + تعليقات محاضرة معيّنة
  saveHighlights,         // حفظ هايلايت + تعليقات محاضرة معيّنة (مؤجَّل تلقائياً)
  signOut: doSignOut      // تسجيل الخروج
};

// نتجنب تهيئة نفس تطبيق Firebase مرتين لو الصفحة حمّلت وحدتين بالخطأ
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ============================================
   1) شاشة تسجيل الدخول الإجبارية
   ============================================ */
const style = document.createElement('style');
style.textContent = `
  #mc-overlay{
    position:fixed; inset:0; z-index:9999;
    display:flex; align-items:center; justify-content:center;
    padding:20px;
    background:#e8ece3;
    background-image:
      radial-gradient(circle at 20% 10%, rgba(184,134,47,0.07), transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(31,74,61,0.06), transparent 40%);
    font-family:'Tajawal','Segoe UI',Tahoma,sans-serif;
    direction:rtl;
  }
  #mc-overlay.mc-hidden{ display:none; }
  .mc-box{
    width:100%; max-width:400px;
    background:#fbfaf4;
    border:1px solid #d3d8ca;
    border-radius:16px;
    padding:34px 28px;
    box-shadow:0 2px 4px rgba(38,36,29,0.08), 0 12px 28px rgba(38,36,29,0.10);
  }
  .mc-head{ text-align:center; margin-bottom:24px; }
  .mc-head h2{
    margin:0;
    font-family:'Amiri','Tajawal',serif;
    font-size:26px; font-weight:700;
    color:#163931;
  }
  .mc-sub{ margin:8px 0 0; font-size:13px; color:#6a6a5b; }
  .mc-tabs{
    display:flex; border:1px solid #d3d8ca; border-radius:10px;
    overflow:hidden; margin-bottom:22px;
  }
  .mc-tab{
    flex:1; text-align:center; padding:10px; cursor:pointer;
    font-size:14px; color:#6a6a5b; background:#e3ebe4;
    transition:all .15s; border:none; font-family:inherit;
  }
  .mc-tab.active{ background:#1f4a3d; color:#fff; font-weight:500; }
  .mc-field{ margin-bottom:14px; }
  .mc-field label{ display:block; font-size:13px; color:#6a6a5b; margin-bottom:6px; }
  .mc-field input{
    width:100%; box-sizing:border-box;
    padding:11px 14px;
    border:1px solid #d3d8ca; border-radius:9px;
    background:#e8ece3;
    font-family:'Tajawal',sans-serif; font-size:14px; color:#2b2a24;
    outline:none; transition:border-color .2s;
  }
  .mc-field input:focus{ border-color:#b8862f; }
  .mc-submit{
    width:100%; padding:12px;
    background:#1f4a3d; color:#fff;
    border:none; border-radius:9px;
    font-family:'Tajawal',sans-serif; font-size:15px; font-weight:500;
    cursor:pointer; margin-top:6px; transition:background .15s;
  }
  .mc-submit:hover{ background:#163931; }
  .mc-submit:disabled{ opacity:.6; cursor:not-allowed; }
  .mc-msg{
    margin-top:12px; padding:10px 14px; border-radius:9px;
    font-size:13px; text-align:center; display:none;
  }
  .mc-msg.error{ display:block; background:rgba(145,75,52,0.1); color:#914b34; }
  .mc-msg.success{ display:block; background:rgba(31,74,61,0.1); color:#1f4a3d; }
  .mc-note{
    margin-top:16px; text-align:center;
    font-size:12px; color:#6a6a5b;
  }

  /* شريحة الحساب أسفل الصفحة */
  #mc-chip{
    position:fixed; bottom:14px; left:14px; z-index:9000;
    display:none; align-items:center; gap:10px;
    background:#fbfaf4;
    border:1px solid #d3d8ca;
    border-radius:20px;
    padding:6px 8px 6px 14px;
    font-family:'Tajawal',sans-serif; font-size:12px;
    color:#6a6a5b;
    direction:rtl;
    box-shadow:0 1px 2px rgba(38,36,29,0.06), 0 6px 20px rgba(38,36,29,0.06);
  }
  #mc-chip.show{ display:flex; }
  #mc-chip .mc-chip-email{ color:#163931; font-weight:500; }
  #mc-chip button{
    background:transparent; border:1px solid #d3d8ca;
    color:#6a6a5b; border-radius:14px;
    padding:4px 12px; cursor:pointer;
    font-family:inherit; font-size:12px;
  }
  #mc-chip button:hover{ border-color:#914b34; color:#914b34; }
`;
document.head.appendChild(style);

const overlay = document.createElement('div');
overlay.id = 'mc-overlay';
overlay.innerHTML = `
  <div class="mc-box">
    <div class="mc-head">
      <h2>منهجي في طلب العلم</h2>
      <p class="mc-sub">تسجيل الدخول مطلوب لحفظ تقدّمك ومزامنته عبر أجهزتك</p>
    </div>
    <div class="mc-tabs">
      <button type="button" class="mc-tab active" data-mode="login">تسجيل الدخول</button>
      <button type="button" class="mc-tab" data-mode="signup">إنشاء حساب</button>
    </div>
    <form id="mc-form">
      <div class="mc-field">
        <label for="mc-email">البريد الإلكتروني</label>
        <input type="email" id="mc-email" required placeholder="example@email.com" autocomplete="email">
      </div>
      <div class="mc-field">
        <label for="mc-password">كلمة المرور</label>
        <input type="password" id="mc-password" required minlength="6" placeholder="6 أحرف على الأقل" autocomplete="current-password">
      </div>
      <button type="submit" class="mc-submit" id="mc-submit">تسجيل الدخول</button>
    </form>
    <div class="mc-msg" id="mc-msg"></div>
    <p class="mc-note">بياناتك محفوظة على حسابك وحدك، ولا يطّلع عليها غيرك</p>
  </div>
`;

const chip = document.createElement('div');
chip.id = 'mc-chip';
chip.innerHTML = `
  <span class="mc-chip-email" id="mc-chip-email"></span>
  <button type="button" id="mc-chip-out">خروج</button>
`;

function mountUI(){
  document.body.appendChild(overlay);
  document.body.appendChild(chip);
  wireUI();
}
if(document.body){ mountUI(); }
else{ document.addEventListener('DOMContentLoaded', mountUI); }

let currentMode = 'login';

function wireUI(){
  const tabs = overlay.querySelectorAll('.mc-tab');
  const form = overlay.querySelector('#mc-form');
  const submitBtn = overlay.querySelector('#mc-submit');
  const msgEl = overlay.querySelector('#mc-msg');
  const passInput = overlay.querySelector('#mc-password');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.dataset.mode;
      submitBtn.textContent = currentMode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب';
      passInput.autocomplete = currentMode === 'login' ? 'current-password' : 'new-password';
      msgEl.className = 'mc-msg';
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.className = 'mc-msg';
    const email = overlay.querySelector('#mc-email').value.trim();
    const password = passInput.value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري التحميل...';
    try{
      if(currentMode === 'login'){
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      msgEl.textContent = 'تم بنجاح، جاري الفتح...';
      msgEl.className = 'mc-msg success';
    }catch(err){
      msgEl.textContent = friendlyError(err.code);
      msgEl.className = 'mc-msg error';
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = currentMode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب';
    }
  });

  chip.querySelector('#mc-chip-out').addEventListener('click', () => {
    if(confirm('هل تريد تسجيل الخروج؟')) doSignOut();
  });
}

function friendlyError(code){
  const map = {
    'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
    'auth/email-already-in-use': 'هذا البريد مسجّل بالفعل، جرّب تسجيل الدخول',
    'auth/weak-password': 'كلمة المرور ضعيفة، استخدم 6 أحرف على الأقل',
    'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً',
    'auth/network-request-failed': 'تعذر الاتصال بالإنترنت، تأكد من الشبكة'
  };
  return map[code] || 'حدث خطأ، حاول مرة أخرى';
}

/* ---------- مراقبة حالة الدخول ---------- */
let wasLoggedIn = false;

onAuthStateChanged(auth, (user) => {
  window.ManhajCloud.user = user;

  if(user){
    wasLoggedIn = true;
    overlay.classList.add('mc-hidden');
    chip.classList.add('show');
    chip.querySelector('#mc-chip-email').textContent = user.email;
    _resolveReady(user);
  } else {
    overlay.classList.remove('mc-hidden');
    chip.classList.remove('show');
    if(wasLoggedIn) location.reload();
  }
});

async function doSignOut(){
  try{ await signOut(auth); }catch(e){}
  location.reload();
}

/* ============================================
   2) القراءة والكتابة من Firestore
   البنية: manhaj_users/{uid}
   مستند واحد يحتوي:
     lectures    (كائن: { lectureOrDayId: "1" | "0", ... })
     activityLog (مصفوفة تواريخ إنجاز، لحساب السلسلة/Streak)
     ts          (رقم — طابع وقت آخر تحديث)
   ============================================ */

async function loadProgress(){
  const user = window.ManhajCloud.user;
  if(!user) return null;
  try{
    const snap = await getDoc(doc(db, 'manhaj_users', user.uid));
    return snap.exists() ? snap.data() : null;
  }catch(e){
    console.error('فشل تحميل بيانات التقدم السحابية:', e);
    return null;
  }
}

/* الكتابة مؤجَّلة (debounce) حتى لا نرسل طلباً مع كل تحديد */
let _pendingData = null;
let _saveTimer = null;

function saveProgress(dataObj, ts){
  const user = window.ManhajCloud.user;
  if(!user) return;
  _pendingData = { lectures: dataObj.lectures, activityLog: dataObj.activityLog, ts: ts || Date.now() };

  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushProgress, 800);
}

async function flushProgress(){
  const user = window.ManhajCloud.user;
  if(!user || !_pendingData) return;
  const data = _pendingData;
  _pendingData = null;
  try{
    await setDoc(doc(db, 'manhaj_users', user.uid), data, { merge:true });
  }catch(e){
    console.error('فشل الحفظ السحابي:', e);
    _pendingData = Object.assign(data, _pendingData || {});
  }
}

document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') flushProgress();
});
window.addEventListener('pagehide', () => flushProgress());

/* ============================================
   3) الهايلايت والتعليقات لكل محاضرة على حدة
   البنية: manhaj_highlights/{uid}_{lectureId}
   مستند لكل (مستخدم × محاضرة) يحتوي:
     blocks  (كائن: { blockId: "innerHTML..." })
     notes   (كائن: { markKey: "نص التعليق" })
     ts      (رقم — طابع وقت آخر تحديث)
   ============================================ */

async function loadHighlights(lectureId){
  const user = window.ManhajCloud.user;
  if(!user) return null;
  try{
    const snap = await getDoc(doc(db, 'manhaj_highlights', user.uid + '_' + lectureId));
    return snap.exists() ? snap.data() : null;
  }catch(e){
    console.error('فشل تحميل الهايلايت السحابي:', e);
    return null;
  }
}

const _pendingHl = {};
const _hlTimers = {};

function saveHighlights(lectureId, dataObj, ts){
  const user = window.ManhajCloud.user;
  if(!user) return;
  _pendingHl[lectureId] = { blocks: dataObj.blocks, notes: dataObj.notes, ts: ts || Date.now() };

  clearTimeout(_hlTimers[lectureId]);
  _hlTimers[lectureId] = setTimeout(() => flushHighlights(lectureId), 800);
}

async function flushHighlights(lectureId){
  const user = window.ManhajCloud.user;
  if(!user) return;
  const data = _pendingHl[lectureId];
  if(!data) return;
  delete _pendingHl[lectureId];
  try{
    await setDoc(doc(db, 'manhaj_highlights', user.uid + '_' + lectureId), data, { merge:true });
  }catch(e){
    console.error('فشل الحفظ السحابي للهايلايت:', e);
    _pendingHl[lectureId] = Object.assign(data, _pendingHl[lectureId] || {});
  }
}

document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden'){
    Object.keys(_pendingHl).forEach(flushHighlights);
  }
});
window.addEventListener('pagehide', () => {
  Object.keys(_pendingHl).forEach(flushHighlights);
});
