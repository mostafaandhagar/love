import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getFirestore, doc, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB8571CLuVK9RwvN16p8agV95w0G9AfhSg',
  authDomain: 'mostafasharaf-91a86.firebaseapp.com',
  projectId: 'mostafasharaf-91a86',
  storageBucket: 'mostafasharaf-91a86.firebasestorage.app',
  messagingSenderId: '1060150475919',
  appId: '1:1060150475919:web:65346cd9aa5d22aee1c4fa'
};
const firebaseApp = initializeApp(firebaseConfig);
const database = getFirestore(firebaseApp);
const firebaseAuth = getAuth(firebaseApp);
const firebaseSessionReady = signInAnonymously(firebaseAuth).catch(error => {
  console.warn('Could not create Firebase session:', error);
  throw error;
});
const memoriesDocument = doc(database, 'memoryWall', 'sharedMemories');
const messagesDocument = doc(database, 'memoryWall', 'privateMessages');
const CLOUDINARY_CLOUD_NAME = 'klxrsmyj';
const CLOUDINARY_UPLOAD_PRESET = 'hagar_mostafa_memories';

firebaseSessionReady.catch(() => {});

const LS = { memories: 'hagar-mostafa-memory-wall-v1', messages: 'hagar-mostafa-private-messages-v1', lights: 'hagar-mostafa-lights' };
const $ = selector => document.querySelector(selector);
const loginButton = $('#loginButton'), messagesButton = $('#messagesButton'), addButton = $('#addMemoryButton');
const loginModal = $('#loginModal'), memoryModal = $('#memoryModal'), identityModal = $('#identityModal');
const messagesModal = $('#messagesModal'), composeModal = $('#composeModal'), inboxModal = $('#inboxModal');
const confirmModal = $('#confirmModal'), lightbox = $('#lightbox');
const memoryWall = $('#memoryWall'), emptyState = $('#emptyState'), lightSwitch = $('#lightSwitch');

let currentPerson = sessionStorage.getItem('memoryWallPerson') || '';
let loggedIn = sessionStorage.getItem('memoryWallLoggedIn') === 'true' && Boolean(currentPerson);
const isHagar = () => currentPerson === 'Hagar';

/* ---------- أدوات صغيرة ---------- */
const readJSON = key => { try { return JSON.parse(localStorage.getItem(key)) ?? []; } catch { return []; } };
const readMemories = () => readJSON(LS.memories);
const readMessages = () => readJSON(LS.messages);
const otherPerson = () => (isHagar() ? 'Mostafa' : 'Hagar');
const personLabel = person => (person === 'Hagar' ? 'هاجر' : 'مصطفى');
const unreadCount = () => readMessages().filter(m => m.to === currentPerson && !m.read).length;
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
const dateLabel = value => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const escapeHtml = text => { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; };
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const safeUrl = url => typeof url === 'string' && /^(https:\/\/|data:(image|video)\/)/.test(url);
const cloudUrl = (url, transform) => (url.includes('res.cloudinary.com') && url.includes('/upload/') ? url.replace('/upload/', `/upload/${transform}/`) : url);
const thumbUrl = url => cloudUrl(url, 'f_auto,q_auto,w_480,c_limit');
const fullUrl = url => cloudUrl(url, 'f_auto,q_auto,w_1600,c_limit');

function toast(message) {
  const box = $('#toast');
  box.textContent = message; box.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => box.classList.remove('show'), 3800);
}
function askConfirm(message) {
  return new Promise(resolve => {
    $('#confirmText').textContent = message;
    $('#confirmYes').onclick = () => { resolve(true); confirmModal.close(); };
    $('#confirmNo').onclick = () => confirmModal.close();
    confirmModal.onclose = () => resolve(false);
    confirmModal.showModal();
  });
}
function errorText(error, fallback) {
  const code = error?.code || '';
  if (code === 'permission-denied' || code.startsWith('auth/')) return 'Firebase مانع العملية: فعّلوا Anonymous في Authentication وانشروا Rules بتاعة Firestore.';
  if (/size|large/i.test(error?.message || '')) return 'حجم أحد الملفات كبير. جرّبوا ملف أصغر.';
  if (code === 'unavailable' || !navigator.onLine) return 'مفيش إنترنت دلوقتي. جرّبوا تاني لما يرجع.';
  return fallback;
}

/* ---------- الحفظ: transaction علشان محدش يمسح تغييرات التاني ---------- */
async function mutate(ref, field, storageKey, change) {
  await firebaseSessionReady;
  const next = await runTransaction(database, async tx => {
    const snap = await tx.get(ref);
    const value = change(snap.data()?.[field] ?? []);
    tx.set(ref, { [field]: value, updatedAt: Date.now() }, { merge: true });
    return value;
  });
  localStorage.setItem(storageKey, JSON.stringify(next));
  return next;
}
const mutateMemories = change => mutate(memoriesDocument, 'groups', LS.memories, change).then(renderWall);
const mutateMessages = change => mutate(messagesDocument, 'items', LS.messages, change).then(updateUnreadUI);

/* ---------- رفع الملفات ---------- */
function prepareFile(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return Promise.resolve(file);
  return new Promise(resolve => {
    const image = new Image(), source = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(source);
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', .85);
    };
    image.onerror = () => { URL.revokeObjectURL(source); resolve(file); };
    image.src = source;
  });
}
async function fileToItem(file) {
  const type = file.type.startsWith('video/') ? 'video' : 'image';
  const body = new FormData();
  body.append('file', type === 'image' ? await prepareFile(file) : file, file.name);
  body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  body.append('folder', 'hagar-mostafa');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`, { method: 'POST', body });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'cloud-upload-failed');
  return { type, data: result.secure_url, name: file.name.replace(/\.[^/.]+$/, '').slice(0, 28) };
}

function updateLoveCounter() {
  const firstDay = new Date(2026, 7, 15), today = new Date();
  firstDay.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.floor((today - firstDay) / 86400000));
  $('#daysTogether').textContent = new Intl.NumberFormat('ar-EG').format(days);
  $('#daysWord').textContent = days >= 3 && days <= 10 ? 'أيام' : 'يوم';
}

/* ---------- الحبل واللمبات ---------- */
const waveY = x => 20 + Math.sin((x / 118) * Math.PI * 2) * 5.4 + Math.sin((x / 236) * Math.PI * 2 + .7) * 1.8;
let ropeObserver = null;
const videoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) entry.target.play().catch(() => {}); else entry.target.pause();
}), { threshold: .25 });

function syncRope(row) {
  const clips = row.querySelector('.clips'), rope = row.querySelector('.rope');
  rope.style.transform = `translateX(${-clips.scrollLeft}px) rotate(${row.style.getPropertyValue('--tilt') || '0deg'})`;
}
function layoutRope(row) {
  const clips = row.querySelector('.clips'), rope = row.querySelector('.rope');
  const width = Math.max(clips.scrollWidth, clips.clientWidth);
  row.style.setProperty('--rope-width', `${width}px`);
  row.classList.toggle('scrollable', clips.scrollWidth > clips.clientWidth + 4);
  let path = `M 0 ${waveY(0).toFixed(1)}`;
  for (let x = 5; x <= width; x += 5) path += ` L ${x} ${waveY(x).toFixed(1)}`;
  const count = Math.max(5, Math.ceil(width / 165));
  let lights = '';
  for (let i = 0; i < count; i++) {
    const x = width * ((i + .5) / count), left = `${((x / width) * 100).toFixed(3)}%`, y = waveY(x);
    lights += `<span class="light-cast" style="left:${left};right:auto;top:${(y + 15).toFixed(1)}px"></span><span class="bulb" style="left:${left};right:auto;top:${(y + 6).toFixed(1)}px;transform:translateX(-50%)"></span>`;
  }
  rope.innerHTML = `<svg viewBox="0 0 ${width} 45" preserveAspectRatio="xMinYMid meet" aria-hidden="true"><path d="${path}"/></svg>${lights}`;
  clips.querySelectorAll('.memory').forEach(card => {
    const x = card.offsetLeft + card.offsetWidth / 2;
    card.style.setProperty('--hang-offset', `${rope.offsetTop + waveY(x) + 20 - (clips.offsetTop + card.offsetTop)}px`);
  });
  syncRope(row);
}

/* ---------- رسم الحيطة (DOM مش innerHTML علشان الأمان) ---------- */
function buildCard(item, index) {
  const card = document.createElement('figure');
  card.className = 'memory';
  card.dataset.src = item.data; card.dataset.type = item.type === 'video' ? 'video' : 'image';
  card.style.setProperty('--rotation', `${[-3, 2, -1.5, 3, -2, 1][index % 6]}deg`);
  if (loggedIn) {
    const controls = document.createElement('div');
    controls.className = 'memory-controls';
    controls.innerHTML = '<button type="button" class="replace-media" title="غيّر الملف" aria-label="غيّر الملف">↻</button><button type="button" class="delete-media" title="امسح الملف" aria-label="امسح الملف">×</button>';
    card.append(controls);
  }
  const wrap = document.createElement('div');
  wrap.className = 'media-wrap';
  if (card.dataset.type === 'video') {
    const video = document.createElement('video');
    video.src = thumbUrl(item.data); video.muted = true; video.loop = true; video.playsInline = true;
    video.preload = 'metadata'; video.disablePictureInPicture = true;
    videoObserver.observe(video); wrap.append(video);
  } else {
    const image = document.createElement('img');
    image.src = thumbUrl(item.data); image.alt = item.name || 'ذكرى جميلة'; image.loading = 'lazy'; image.decoding = 'async'; image.draggable = false;
    wrap.append(image);
  }
  card.append(wrap);
  return card;
}
function renderWall() {
  ropeObserver?.disconnect(); videoObserver.disconnect();
  ropeObserver = new ResizeObserver(entries => entries.forEach(entry => layoutRope(entry.target.closest('.memory-row'))));
  const savedScroll = new Map([...memoryWall.querySelectorAll('.memory-row')].map(r => [r.dataset.date, r.querySelector('.clips')?.scrollLeft || 0]));
  const memories = readMemories().filter(g => g && isDate(g.date) && Array.isArray(g.items)).sort((a, b) => b.date.localeCompare(a.date));
  memoryWall.innerHTML = '';
  emptyState.hidden = memories.length !== 0;
  memories.forEach((group, groupIndex) => {
    const items = group.items.filter(item => item && safeUrl(item.data));
    if (!items.length) return;
    const row = document.createElement('article');
    row.className = 'memory-row'; row.dataset.date = group.date;
    row.style.setProperty('--tilt', groupIndex % 2 ? '.4deg' : '-.35deg');
    const tag = document.createElement('div'); tag.className = 'date-tag'; tag.textContent = dateLabel(group.date);
    row.append(tag);
    if (loggedIn) {
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'group-delete'; del.dataset.date = group.date; del.title = 'امسح اليوم ده'; del.textContent = 'مسح اليوم';
      row.append(del);
    }
    const rope = document.createElement('div'); rope.className = 'rope';
    const clips = document.createElement('div'); clips.className = 'clips';
    items.forEach((item, i) => clips.append(buildCard(item, i)));
    row.append(rope, clips);
    [['‹', -1], ['›', 1]].forEach(([symbol, dir]) => {
      const arrow = document.createElement('button');
      arrow.type = 'button'; arrow.className = `row-arrow ${dir < 0 ? 'prev' : 'next'}`; arrow.textContent = symbol;
      arrow.setAttribute('aria-label', dir < 0 ? 'الصور السابقة' : 'الصور التالية');
      arrow.addEventListener('click', () => clips.scrollBy({ left: dir * clips.clientWidth * .8, behavior: 'smooth' }));
      row.append(arrow);
    });
    clips.addEventListener('scroll', () => syncRope(row), { passive: true });
    memoryWall.append(row);
    if (savedScroll.get(group.date)) clips.scrollLeft = savedScroll.get(group.date);
    ropeObserver.observe(clips);
  });
}

/* سحب الصفوف بالماوس على الكمبيوتر */
let drag = null, justDragged = false;
memoryWall.addEventListener('pointerdown', event => {
  const clips = event.target.closest('.clips');
  if (!clips || event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button')) return;
  drag = { clips, x: event.clientX, left: clips.scrollLeft, moved: false };
});
window.addEventListener('pointermove', event => {
  if (!drag) return;
  const dx = event.clientX - drag.x;
  if (Math.abs(dx) > 5) { drag.moved = true; drag.clips.classList.add('dragging'); }
  if (drag.moved) drag.clips.scrollLeft = drag.left - dx;
});
window.addEventListener('pointerup', () => {
  if (!drag) return;
  drag.clips.classList.remove('dragging'); justDragged = drag.moved; drag = null;
  setTimeout(() => { justDragged = false; }, 0);
});

/* ---------- عرض الصورة بحجم كبير ---------- */
let lbItems = [], lbIndex = 0, lbDate = '';
function showLightbox() {
  const item = lbItems[lbIndex], stage = $('#lightboxStage');
  stage.innerHTML = '';
  let media;
  if (item.type === 'video') {
    media = document.createElement('video');
    media.src = cloudUrl(item.src, 'f_auto,q_auto'); media.controls = true; media.autoplay = true; media.loop = true; media.playsInline = true;
  } else {
    media = new Image(); media.src = fullUrl(item.src); media.alt = 'ذكرى';
  }
  stage.append(media);
  $('#lightboxCaption').textContent = `${lbDate} · ${new Intl.NumberFormat('ar-EG').format(lbIndex + 1)} من ${new Intl.NumberFormat('ar-EG').format(lbItems.length)}`;
  $('#lbPrev').hidden = $('#lbNext').hidden = lbItems.length < 2;
}
function stepLightbox(step) { if (lbItems.length < 2) return; lbIndex = (lbIndex + step + lbItems.length) % lbItems.length; showLightbox(); }
function openLightbox(card) {
  const row = card.closest('.memory-row'), cards = [...row.querySelectorAll('.memory')];
  lbItems = cards.map(c => ({ src: c.dataset.src, type: c.dataset.type })); lbIndex = cards.indexOf(card); lbDate = dateLabel(row.dataset.date);
  showLightbox(); lightbox.showModal();
}
$('#lbPrev').addEventListener('click', () => stepLightbox(-1));
$('#lbNext').addEventListener('click', () => stepLightbox(1));
lightbox.addEventListener('click', event => { if (event.target.classList.contains('lightbox-card')) lightbox.close(); });
lightbox.addEventListener('close', () => { $('#lightboxStage').innerHTML = ''; });
lightbox.addEventListener('keydown', event => { if (event.key === 'ArrowRight') stepLightbox(1); if (event.key === 'ArrowLeft') stepLightbox(-1); });
let swipeStart = null;
$('#lightboxStage').addEventListener('pointerdown', event => { swipeStart = event.clientX; });
$('#lightboxStage').addEventListener('pointerup', event => {
  if (swipeStart === null) return;
  const dx = event.clientX - swipeStart; swipeStart = null;
  if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
});

/* ---------- واجهة الدخول والرسائل ---------- */
function updateUnreadUI() {
  const count = loggedIn ? unreadCount() : 0;
  $('#headerUnread').textContent = count; $('#modalUnread').textContent = count;
}
function updatePersonLanguage() {
  const f = isHagar();
  $('#messagesPrompt').textContent = f ? 'حابة تعملي إيه؟' : 'حابب تعمل إيه؟';
  $('#writeMessageChoice').innerHTML = `<span>✎</span> ${f ? 'اكتبي رسالة' : 'اكتب رسالة'}`;
  $('#readMessagesChoice').innerHTML = `<span>✉</span> ${f ? 'اقري الرسائل' : 'اقرأ الرسائل'} <b id="modalUnread">0</b>`;
  addButton.innerHTML = `<span>+</span> ${f ? 'ضيفي ذكرى' : 'ضيف ذكرى'}`;
  $('#messageText').placeholder = f ? 'اكتبي من قلبك…' : 'اكتب من قلبك…';
  $('#composeSubmit').textContent = f ? 'ابعتي الرسالة' : 'ابعت الرسالة';
}
function updateAuthUI() {
  loginButton.textContent = loggedIn ? 'خروج' : 'دخول';
  addButton.hidden = !loggedIn; messagesButton.hidden = !loggedIn;
  updatePersonLanguage(); updateUnreadUI();
}

loginButton.addEventListener('click', () => {
  if (loggedIn) {
    loggedIn = false; currentPerson = '';
    sessionStorage.removeItem('memoryWallLoggedIn'); sessionStorage.removeItem('memoryWallPerson');
    updateAuthUI(); renderWall();
  } else loginModal.showModal();
});
$('#loginForm').addEventListener('submit', event => {
  event.preventDefault();
  const user = $('#username').value.trim().toLowerCase(), pass = $('#password').value;
  if (user === 'hagarandmostafa' && pass === '1508') {
    loginModal.close(); event.target.reset(); $('#loginError').textContent = ''; identityModal.showModal();
  } else $('#loginError').textContent = 'اسم المستخدم أو كلمة المرور مش صح.';
});
identityModal.addEventListener('cancel', event => event.preventDefault());
document.querySelectorAll('.identity-choice[data-person]').forEach(button => button.addEventListener('click', () => {
  currentPerson = button.dataset.person; loggedIn = true;
  sessionStorage.setItem('memoryWallLoggedIn', 'true'); sessionStorage.setItem('memoryWallPerson', currentPerson);
  identityModal.close(); updateAuthUI(); renderWall();
  if (unreadCount() > 0) messagesModal.showModal();
}));
messagesButton.addEventListener('click', () => { updateUnreadUI(); messagesModal.showModal(); });
$('#addMediaFromMessages').addEventListener('click', () => { messagesModal.close(); addButton.click(); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));

$('#writeMessageChoice').addEventListener('click', () => {
  messagesModal.close();
  $('#recipientLine').textContent = `الرسالة دي هتوصل ${isHagar() ? 'لمصطفى' : 'لهاجر'} بس.`;
  $('#messageText').value = ''; $('#messageError').textContent = ''; composeModal.showModal();
});
$('#composeForm').addEventListener('submit', async event => {
  event.preventDefault();
  const text = $('#messageText').value.trim(), error = $('#messageError'), button = $('#composeSubmit');
  if (button.disabled) return;
  if (!text) { error.textContent = isHagar() ? 'اكتبي رسالة الأول.' : 'اكتب رسالة الأول.'; return; }
  const message = { id: uid(), from: currentPerson, to: otherPerson(), text, createdAt: new Date().toISOString(), read: false };
  error.textContent = 'جاري إرسال الرسالة…'; button.disabled = true;
  try {
    await mutateMessages(list => [...list, message]);
    error.textContent = ''; composeModal.close(); messagesModal.showModal();
  } catch (sendError) {
    error.textContent = errorText(sendError, 'الرسالة ما اتبعتتش. اتأكد من الإنترنت وجرب تاني.');
  } finally { button.disabled = false; }
});
$('#readMessagesChoice').addEventListener('click', () => {
  messagesModal.close();
  const received = readMessages().filter(m => m.to === currentPerson).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (received.some(m => !m.read)) mutateMessages(list => list.map(m => (m.to === currentPerson && !m.read ? { ...m, read: true } : m))).catch(() => {});
  $('#inboxSubheading').textContent = received.length ? `رسايل متبعتة لـ ${personLabel(currentPerson)}.` : `لسه مفيش رسايل — ${personLabel(otherPerson())} يقدر يبعتلك رسالة.`;
  $('#inboxList').innerHTML = received.length
    ? received.map(m => `<article class="message-note"><small>من ${personLabel(m.from)} · ${new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(m.createdAt))}</small><p>${escapeHtml(m.text).replace(/\n/g, '<br>')}</p></article>`).join('')
    : '<p class="no-messages">صندوق الرسايل مستني أول كلمة حلوة. ♥</p>';
  inboxModal.showModal();
});

/* ---------- إضافة ذكرى ---------- */
const uploadBoxDefault = 'اضغطوا هنا لاختيار الملفات <small>ينفع تختاروا أكتر من صورة أو فيديو.</small>';
addButton.addEventListener('click', () => {
  $('#memoryDate').value = todayLocal(); $('#uploadBox').innerHTML = uploadBoxDefault; $('#memoryError').textContent = '';
  memoryModal.showModal();
});
$('#memoryFiles').addEventListener('change', event => {
  const n = event.target.files.length;
  $('#uploadBox').innerHTML = n ? `تم اختيار ${n} ملف ✨ <small>اضغطوا لو عايزين تغيّروهم.</small>` : uploadBoxDefault;
});
$('#memoryForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target, button = $('#memorySubmit'), error = $('#memoryError');
  if (button.disabled) return;
  const date = $('#memoryDate').value, files = [...$('#memoryFiles').files];
  error.className = 'form-error';
  if (!isDate(date) || !files.length) { error.textContent = 'اختاروا التاريخ والملفات الأول.'; return; }
  const label = button.textContent; let done = 0;
  const progress = () => { error.className = 'form-error info'; error.textContent = `جاري الرفع… ${done} من ${files.length}`; };
  button.disabled = true; button.textContent = 'جاري الرفع…'; progress();
  try {
    const items = await Promise.all(files.map(file => fileToItem(file).then(item => { done++; progress(); return item; })));
    await mutateMemories(all => {
      const group = all.find(g => g.date === date);
      if (group) { group.items.push(...items); return all; }
      return [...all, { date, items }];
    });
    memoryModal.close(); form.reset(); error.textContent = '';
  } catch (saveError) {
    error.className = 'form-error';
    error.textContent = errorText(saveError, 'حصلت مشكلة أثناء رفع أو حفظ الملفات. جرّبوا تاني.');
  } finally { button.disabled = false; button.textContent = label; }
});

/* ---------- مسح وتغيير الذكريات ---------- */
memoryWall.addEventListener('click', async event => {
  if (justDragged) return;
  const button = event.target.closest('button'), card = event.target.closest('.memory');
  if (!button) { if (card) openLightbox(card); return; }
  if (!loggedIn || button.classList.contains('row-arrow')) return;
  try {
    if (button.classList.contains('group-delete')) {
      const date = button.dataset.date;
      if (await askConfirm('متأكدين إنكم عايزين تمسحوا اليوم ده بكل صوره وفيديوهاته؟')) await mutateMemories(all => all.filter(g => g.date !== date));
      return;
    }
    if (!card) return;
    const date = card.closest('.memory-row').dataset.date, src = card.dataset.src;
    if (button.classList.contains('delete-media')) {
      if (await askConfirm('تمسحوا الذكرى دي؟')) await mutateMemories(all => all.map(g => (g.date === date ? { ...g, items: g.items.filter(i => i.data !== src) } : g)).filter(g => g.items.length));
    } else if (button.classList.contains('replace-media')) {
      const picker = document.createElement('input');
      picker.type = 'file'; picker.accept = 'image/*,video/*';
      picker.onchange = async () => {
        const file = picker.files[0]; if (!file) return;
        try {
          toast('جاري رفع الملف…');
          const item = await fileToItem(file);
          await mutateMemories(all => all.map(g => (g.date === date ? { ...g, items: g.items.map(i => (i.data === src ? item : i)) } : g)));
          toast('اتغيّر ✨');
        } catch (replaceError) { toast(errorText(replaceError, 'حصلت مشكلة أثناء تغيير الملف.')); }
      };
      picker.click();
    }
  } catch (actionError) { toast(errorText(actionError, 'العملية ما تمتش. جرّبوا تاني.')); }
});

/* ---------- الأنوار ---------- */
function setLights(on, save) {
  document.body.classList.toggle('lights-on', on);
  lightSwitch.setAttribute('aria-pressed', String(on));
  lightSwitch.setAttribute('aria-label', on ? 'اطفي الأنوار' : 'شغّل الأنوار');
  if (save) localStorage.setItem(LS.lights, on ? '1' : '0');
}
lightSwitch.addEventListener('click', () => setLights(!document.body.classList.contains('lights-on'), true));
const savedLights = localStorage.getItem(LS.lights), hour = new Date().getHours();
setLights(savedLights === null ? (hour >= 19 || hour < 5) : savedLights === '1', false);

/* ---------- المزامنة اللحظية (بعد ما الجلسة تجهز) ---------- */
firebaseSessionReady.then(() => {
  onSnapshot(memoriesDocument, snapshot => {
    const groups = snapshot.data()?.groups;
    if (!Array.isArray(groups)) return;
    const incoming = JSON.stringify(groups);
    if (incoming === JSON.stringify(readMemories())) return;
    localStorage.setItem(LS.memories, incoming); renderWall();
  }, error => console.warn('Could not read memories from Firebase:', error));
  onSnapshot(messagesDocument, snapshot => {
    const items = snapshot.data()?.items;
    if (!Array.isArray(items)) return;
    localStorage.setItem(LS.messages, JSON.stringify(items)); updateUnreadUI();
  }, error => console.warn('Could not read messages from Firebase:', error));
}).catch(() => {});

updateAuthUI(); renderWall(); updateLoveCounter();
