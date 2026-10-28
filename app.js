import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
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
const apologyDocument = doc(database, 'memoryWall', 'apologyGift');
const CLOUDINARY_CLOUD_NAME = 'klxrsmyj';
const CLOUDINARY_UPLOAD_PRESET = 'hagar_mostafa_memories';

const STORAGE_KEY = 'hagar-mostafa-memory-wall-v1';
const MESSAGE_STORAGE_KEY = 'hagar-mostafa-private-messages-v1';
const loginButton = document.querySelector('#loginButton');
const messagesButton = document.querySelector('#messagesButton');
const addButton = document.querySelector('#addMemoryButton');
const loginModal = document.querySelector('#loginModal');
const memoryModal = document.querySelector('#memoryModal');
const memoryWall = document.querySelector('#memoryWall');
const emptyState = document.querySelector('#emptyState');
const lightSwitch = document.querySelector('#lightSwitch');
const identityModal = document.querySelector('#identityModal');
const messagesModal = document.querySelector('#messagesModal');
const composeModal = document.querySelector('#composeModal');
const inboxModal = document.querySelector('#inboxModal');
const secretPasswordModal = document.querySelector('#secretPasswordModal');
const secretMessageModal = document.querySelector('#secretMessageModal');
const imageViewer = document.querySelector('#imageViewer');
const imageViewerImage = document.querySelector('#imageViewerImage');
const imageViewerVideo = document.querySelector('#imageViewerVideo');
let currentPerson = sessionStorage.getItem('memoryWallPerson') || '';
let loggedIn = sessionStorage.getItem('memoryWallLoggedIn') === 'true' && Boolean(currentPerson);

function readMemories() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; } catch { return []; } }
function saveMemories(memories) {
localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
return firebaseSessionReady.then(() => setDoc(memoriesDocument, { groups:memories, updatedAt:Date.now() }, { merge:true }));
}
function readMessages() { try { return JSON.parse(localStorage.getItem(MESSAGE_STORAGE_KEY)) ?? []; } catch { return []; } }
function saveMessages(messages) {
localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messages));
return firebaseSessionReady.then(() => setDoc(messagesDocument, { items:messages, updatedAt:Date.now() }, { merge:true }));
}
function otherPerson() { return currentPerson === 'Hagar' ? 'Mostafa' : 'Hagar'; }
function personLabel(person) { return person === 'Hagar' ? 'هاجر' : 'مصطفى'; }
function unreadCount() { return readMessages().filter(message => message.to === currentPerson && !message.read).length; }
function dateLabel(value) { return new Intl.DateTimeFormat('ar-EG', { day:'numeric', month:'long', year:'numeric' }).format(new Date(`${value}T12:00:00`)); }
function escapeHtml(text) { const d=document.createElement('div'); d.textContent=text; return d.innerHTML; }
function updateUploadProgress(files, loadedByFile, states) {
const totalBytes=files.reduce((sum,file)=>sum+file.size,0) || 1;
const uploadedBytes=files.reduce((sum,file,index)=>sum+Math.min(file.size,loadedByFile[index] || 0),0);
const percent=Math.min(100,Math.round((uploadedBytes/totalBytes)*100));
document.querySelector('#uploadTotalPercent').textContent=`${percent}%`;
const bar=document.querySelector('#uploadTotalBar'); bar.style.width=`${percent}%`; bar.closest('[role="progressbar"]').setAttribute('aria-valuenow',String(percent));
files.forEach((file,index)=>{
const row=document.querySelector(`#uploadFileList [data-file-index="${index}"]`); if (!row) return;
const filePercent=Math.min(100,Math.round(((loadedByFile[index] || 0)/file.size)*100));
row.className=`upload-file ${states[index] ? `is-${states[index]}` : ''}`;
row.querySelector('.upload-file-state').textContent=states[index]==='success' ? 'تم الرفع' : states[index]==='error' ? 'فشل' : `${filePercent}%`;
});
}
function prepareUploadProgress(files) {
const list=document.querySelector('#uploadFileList');
list.innerHTML=files.map((file,index)=>`<li class="upload-file" data-file-index="${index}"><span class="upload-file-name">${escapeHtml(file.name)}</span><span class="upload-file-state">0%</span></li>`).join('');
document.querySelector('#uploadProgress').hidden=false;
updateUploadProgress(files,[],[]);
}
function uploadToCloudinary(file, type, onProgress) {
const formData=new FormData();
formData.append('file',file);
formData.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);
formData.append('folder','hagar-mostafa');
return new Promise((resolve,reject)=>{
const request=new XMLHttpRequest();
request.open('POST',`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`);
request.upload.onprogress=event=>{ if (event.lengthComputable) onProgress(event.loaded,event.total); };
request.onerror=()=>reject(new Error('cloud-upload-failed'));
request.onabort=()=>reject(new Error('cloud-upload-aborted'));
request.onload=()=>{
let result; try { result=JSON.parse(request.responseText); } catch { reject(new Error('cloud-upload-invalid-response')); return; }
if (request.status < 200 || request.status >= 300 || !result.secure_url) { reject(new Error(result.error?.message || 'cloud-upload-failed')); return; }
onProgress(file.size); resolve(result.secure_url);
};
request.send(formData);
});
}
// Shrinks photos in the browser before they leave the phone: max 2400px on the long side, WebP at ~82%.
// Falls back to the original file whenever that is not possible or would not make it smaller.
const IMAGE_MAX_SIDE = 2400; const IMAGE_WEBP_QUALITY = .82;
async function compressImage(file) {
  if (!file.type.startsWith('image/') || /^image\/(gif|svg\+xml|webp)$/.test(file.type)) return file; // keep animations / vectors / already-webp
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation:'from-image' });
    const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', IMAGE_WEBP_QUALITY));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file; // browser can't encode webp, or no gain
    return new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}.webp`, { type:'image/webp' });
  } catch { return file; }
}
async function fileToItem(file, onProgress=()=>{}) { const type=file.type.startsWith('video/')?'video':'image'; const upload=type==='image' ? await compressImage(file) : file; const data=await uploadToCloudinary(upload,type,onProgress); return {type,data,name:file.name.replace(/\\.[^/.]+$/, '').slice(0,28)}; }

function setupReplyInbox() {
const replyInboxFab=document.querySelector('#replyInboxFab');
const replyModal=document.querySelector('#apologyReplyModal');
  const replyPasswordModal=document.querySelector('#apologyReplyPasswordModal');
let savedReply='';
onSnapshot(apologyDocument,snapshot=>{ const data=snapshot.data(); savedReply=data?.reply || ''; replyInboxFab.hidden=!data?.signed; });
replyInboxFab.addEventListener('click',()=>{
    document.querySelector('#apologyReplyPassword').value=''; document.querySelector('#apologyReplyPasswordError').textContent='';
    replyPasswordModal.showModal();
  });
  document.querySelector('#openApologyReply').addEventListener('click',()=>{
    if (document.querySelector('#apologyReplyPassword').value!=='هجورتي') { document.querySelector('#apologyReplyPasswordError').textContent='الباسوورد مش صح.'; return; }
document.querySelector('#apologyReplyNote').textContent=savedReply || 'لسه مفيش رد محفوظ.';
    replyPasswordModal.close(); replyModal.showModal();
});
}
function updateLoveCounter() { const firstDay = new Date(2026, 7, 15); const today = new Date(); firstDay.setHours(0,0,0,0); today.setHours(0,0,0,0); const days = Math.max(0, Math.floor((today - firstDay) / 86400000)); document.querySelector('#daysTogether').textContent = new Intl.NumberFormat('ar-EG').format(days); document.querySelector('#daysWord').textContent = days >= 3 && days <= 10 ? 'أيام' : 'يوم'; }
const isCloudinaryUpload = url => typeof url === 'string' && url.includes('res.cloudinary.com/') && url.includes('/upload/');
const isCloudinaryVideo = url => isCloudinaryUpload(url) && url.includes('/video/upload/');
function withExtension(url, ext) { const [path, query = ''] = url.split('?'); const withExt = /\.[a-z0-9]{2,5}$/i.test(path) ? path.replace(/\.[a-z0-9]{2,5}$/i, `.${ext}`) : `${path}.${ext}`; return query ? `${withExt}?${query}` : withExt; }
// Wall thumbnails: 4:5 crops that follow the subject (faces) instead of the centre.
function cloudinaryDisplayUrl(url) {
return isCloudinaryUpload(url) ? url.replace('/upload/','/upload/f_auto,q_auto:good,c_fill,g_auto,w_640,h_800/') : url;
}
// Still frame shown before a wall video plays.
function cloudinaryPosterUrl(url) {
return isCloudinaryVideo(url) ? withExtension(url.replace('/upload/','/upload/so_0,f_jpg,q_auto,c_fill,g_auto,w_640,h_800/'),'jpg') : '';
}
// Small, silent clip for the wall; the full one loads only in the viewer.
function cloudinaryVideoThumbUrl(url) {
return isCloudinaryVideo(url) ? withExtension(url.replace('/upload/','/upload/q_auto,c_fill,g_auto,w_480,h_600,ac_none/'),'mp4') : url;
}
// Viewer: sized to the screen (up to 2000px) so big monitors get a sharp photo.
function cloudinaryViewerUrl(url) {
if (!isCloudinaryUpload(url)) return url;
if (isCloudinaryVideo(url)) return withExtension(url.replace('/upload/','/upload/q_auto,c_limit,w_1280,h_1280/'),'mp4');
const pixels = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 2);
const size = Math.min(2000, Math.max(1000, Math.ceil(pixels / 200) * 200));
return url.replace('/upload/',`/upload/f_auto,q_auto:good,c_limit,w_${size},h_${size}/`);
}

// Wall videos only play while they are on screen (and never while the viewer is open).
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let viewerIsOpen = false;
const wallVideoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  const video = entry.target;
  if (entry.isIntersecting && !viewerIsOpen && !reduceMotion.matches) video.play().catch(() => {}); else video.pause();
}), { threshold:.4 });

const ROPE_WAVE = 118;
const ropeY = x => 20 + Math.sin((x / ROPE_WAVE) * Math.PI * 2) * 5.4 + Math.sin((x / (ROPE_WAVE * 2)) * Math.PI * 2 + .7) * 1.8;
const ropeLayouts = new WeakMap(); const pendingRopes = new Set(); let ropeFrame = 0;
const ropeObserver = new ResizeObserver(entries => {
entries.forEach(entry => pendingRopes.add(entry.target));
if (ropeFrame) return;
ropeFrame = requestAnimationFrame(() => { ropeFrame = 0; pendingRopes.forEach(target => ropeLayouts.get(target)?.()); pendingRopes.clear(); });
});
function renderWall() {
ropeObserver.disconnect(); pendingRopes.clear(); wallVideoObserver.disconnect();
const memories = readMemories().sort((a,b) => b.date.localeCompare(a.date));
memoryWall.innerHTML = '';
emptyState.hidden = memories.length !== 0;
memories.forEach((group, groupIndex) => {
const row = document.createElement('article'); row.className = 'memory-row'; row.style.setProperty('--tilt', `${groupIndex % 2 ? '.4deg' : '-.35deg'}`);
row.innerHTML = `<div class="date-tag">${dateLabel(group.date)}</div>${loggedIn ? `<button class="group-delete" type="button" data-date="${group.date}" title="امسح اليوم ده">مسح اليوم</button>` : ''}<div class="rope"></div><div class="clips"></div><button class="rope-nav rope-prev" type="button" aria-label="الصور اللي قبل كده">‹</button><button class="rope-nav rope-next" type="button" aria-label="باقي الصور">›</button>`;
const clips = row.querySelector('.clips');
group.items.forEach((item, itemIndex) => {
if (!item || typeof item.data !== 'string' || !item.data.trim()) return;
const card = document.createElement('figure'); card.className='memory'; card.style.setProperty('--rotation', `${[-3,2,-1.5,3,-2,1][itemIndex % 6]}deg`);
const isVideoItem = item.type === 'video';
const mediaLabel = `${isVideoItem ? 'فيديو' : 'صورة'} ${itemIndex + 1} من ذكريات ${dateLabel(group.date)}`;
const controlsHtml = loggedIn ? `<div class="memory-controls"><button type="button" class="replace-media" data-date="${group.date}" data-index="${itemIndex}" title="غيّر الملف">↻</button><button type="button" class="delete-media" data-date="${group.date}" data-index="${itemIndex}" title="امسح الملف">×</button></div>` : '';
let mediaHtml;
if (isVideoItem) {
  const poster = cloudinaryPosterUrl(item.data);
  mediaHtml = `<video class="memory-video" src="${cloudinaryVideoThumbUrl(item.data)}" ${poster ? `poster="${poster}" preload="none"` : 'preload="metadata"'} data-full-src="${item.data}" muted loop playsinline disablepictureinpicture role="button" tabindex="0" aria-label="افتح ${mediaLabel} بالحجم الكبير"></video><span class="video-badge" aria-hidden="true">▶</span>`;
} else {
  mediaHtml = `<img class="memory-image" src="${cloudinaryDisplayUrl(item.data)}" data-full-src="${item.data}" alt="${mediaLabel}" loading="lazy" decoding="async" width="640" height="800" role="button" tabindex="0" aria-label="افتح ${mediaLabel} بالحجم الكامل">`;
}
card.innerHTML = `${controlsHtml}<div class="media-wrap is-loading">${mediaHtml}</div>`;
const mediaWrap = card.querySelector('.media-wrap'); const mediaEl = mediaWrap.querySelector('img,video');
const markReady = () => mediaWrap.classList.remove('is-loading');
if (mediaEl.tagName === 'VIDEO') { mediaEl.muted = true; markReady(); wallVideoObserver.observe(mediaEl); }
else if (mediaEl.complete && mediaEl.naturalWidth) markReady();
else { mediaEl.addEventListener('load', markReady, { once:true }); mediaEl.addEventListener('error', markReady, { once:true }); }
clips.append(card);
});
const rope = row.querySelector('.rope');
const ropeWidthNow = () => Math.max(clips.scrollWidth, clips.clientWidth);
const buildContinuousRope = () => {
const ropeWidth = ropeWidthNow();
const bulbCount = Math.max(5,Math.ceil(ropeWidth/165));
let pathData='M 0 20';
for (let x=5; x<=ropeWidth; x+=5) pathData+=` L ${x} ${ropeY(x)}`;
const lights=Array.from({length:bulbCount},()=>`<span class="light-cast"></span><span class="bulb"></span>`).join('');
rope.innerHTML=`<svg viewBox="0 0 ${ropeWidth} 45" preserveAspectRatio="xMinYMid meet" aria-hidden="true"><path d="${pathData}"/></svg>${lights}`;
const bulbs=[...rope.querySelectorAll('.bulb')]; const casts=[...rope.querySelectorAll('.light-cast')];
bulbs.forEach((bulb,index) => {
const x=ropeWidth*((index+.5)/bulbs.length); const y=ropeY(x); const left=`${(x/ropeWidth)*100}%`;
bulb.style.left=left; bulb.style.right='auto'; bulb.style.top=`${y+6}px`; bulb.style.transform='translateX(-50%)';
casts[index].style.left=left; casts[index].style.right='auto'; casts[index].style.top=`${y+15}px`;
});
};
const hangMemoriesOnRope = () => {
const cards=[...clips.querySelectorAll('.memory')]; const ropeTop=rope.offsetTop; const clipsTop=clips.offsetTop;
// Read every position first, then write: one layout pass instead of one per photo.
const offsets=cards.map(card => ropeTop+ropeY(card.offsetLeft+(card.offsetWidth/2))+20-(clipsTop+card.offsetTop));
cards.forEach((card,index) => card.style.setProperty('--hang-offset',`${offsets[index]}px`));
};
const syncRope = () => {
row.classList.toggle('can-prev', clips.scrollLeft > 4); row.classList.toggle('can-next', clips.scrollLeft < clips.scrollWidth - clips.clientWidth - 4);
row.style.setProperty('--rope-width', `${Math.max(clips.scrollWidth,clips.clientWidth)}px`);
row.style.setProperty('--rope-shift', `${-clips.scrollLeft}px`);
// Inline transform wins over the small-screen fallback, so every rope follows its own swipe.
rope.style.transform=`translateX(${-clips.scrollLeft}px) rotate(${row.style.getPropertyValue('--tilt') || '0deg'})`;
};
clips.addEventListener('scroll', syncRope, { passive:true });
const layoutRope = () => { syncRope(); buildContinuousRope(); hangMemoriesOnRope(); };
memoryWall.append(row);
// Lays the rope out once the row has a real size, then again whenever its width changes (rotation, resize).
ropeLayouts.set(clips, layoutRope); ropeObserver.observe(clips);
});
}
function updateUnreadUI() { const count = loggedIn ? unreadCount() : 0; document.querySelector('#headerUnread').textContent = count; document.querySelector('#modalUnread').textContent = count; }
function updatePersonLanguage() {
const isHagar=currentPerson === 'Hagar';
document.querySelector('#messagesPrompt').textContent=isHagar ? 'حابة تعملي إيه؟' : 'حابب تعمل إيه؟';
document.querySelector('#writeMessageChoice').innerHTML=`<span>✎</span> ${isHagar ? 'اكتبي رسالة' : 'اكتب رسالة'}`;
document.querySelector('#readMessagesChoice').innerHTML=`<span>✉</span> ${isHagar ? 'اقري الرسائل' : 'اقرأ الرسائل'} <b id="modalUnread">0</b>`;
addButton.innerHTML=`<span>+</span> ${isHagar ? 'ضيفي ذكرى' : 'ضيف ذكرى'}`;
}
function updateAuthUI() { loginButton.textContent = loggedIn ? 'خروج' : 'دخول'; addButton.hidden = !loggedIn; messagesButton.hidden = !loggedIn; document.querySelector('#secretMessageChoice').hidden = currentPerson !== 'Hagar'; updatePersonLanguage(); updateUnreadUI(); }

loginButton.addEventListener('click', () => { if (loggedIn) { loggedIn=false; currentPerson=''; sessionStorage.removeItem('memoryWallLoggedIn'); sessionStorage.removeItem('memoryWallPerson'); updateAuthUI(); renderWall(); } else loginModal.showModal(); });
document.querySelector('#loginForm').addEventListener('submit', (event) => {
event.preventDefault(); const user=document.querySelector('#username').value.trim().toLowerCase(); const pass=document.querySelector('#password').value;
if (user === 'hagarandmostafa' && pass === '1508') { loginModal.close(); event.target.reset(); document.querySelector('#loginError').textContent=''; identityModal.showModal(); } else document.querySelector('#loginError').textContent='اسم المستخدم أو كلمة المرور مش صح.';
});
document.querySelectorAll('.identity-choice').forEach(button => button.addEventListener('click', () => { currentPerson=button.dataset.person; loggedIn=true; sessionStorage.setItem('memoryWallLoggedIn','true'); sessionStorage.setItem('memoryWallPerson',currentPerson); identityModal.close(); updateAuthUI(); renderWall(); messagesModal.showModal(); }));
messagesButton.addEventListener('click', () => { updateUnreadUI(); messagesModal.showModal(); });
document.querySelector('#addMediaFromMessages').addEventListener('click', () => { messagesModal.close(); addButton.click(); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.querySelector(`#${button.dataset.close}`).close()));
/* ===== Media viewer: next/previous, swipe, pinch + double-tap zoom, keyboard, loading state ===== */
const viewerStage = document.querySelector('#viewerStage');
const viewerMediaBox = document.querySelector('#viewerMedia');
const viewerSpinner = document.querySelector('#viewerSpinner');
const viewerPrev = document.querySelector('#viewerPrev');
const viewerNext = document.querySelector('#viewerNext');
const viewerDate = document.querySelector('#viewerDate');
const viewerCounter = document.querySelector('#viewerCounter');
const arabicNumber = new Intl.NumberFormat('ar-EG');
const MEDIA_SELECTOR = '.memory-image,.memory-video';
const viewerView = { scale:1, x:0, y:0 };
let viewerItems = [];
let viewerIndex = -1;
let viewerToken = 0;
let spinnerTimer = 0;

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

function applyViewerTransform(animate = false) {
  viewerMediaBox.style.transition = animate ? 'transform .28s cubic-bezier(.2,.8,.2,1)' : 'none';
  viewerMediaBox.style.transform = `translate3d(${viewerView.x}px,${viewerView.y}px,0) scale(${viewerView.scale})`;
  imageViewer.classList.toggle('is-zoomed', viewerView.scale > 1.02);
}
function resetViewerTransform(animate = false) {
  viewerView.scale = 1; viewerView.x = 0; viewerView.y = 0;
  imageViewer.style.setProperty('--drag-fade', 0);
  applyViewerTransform(animate);
}
function currentViewerElement() { return imageViewerVideo.hidden ? imageViewerImage : imageViewerVideo; }
function clampViewerPan() {
  if (viewerView.scale <= 1.02) { viewerView.x = 0; viewerView.y = 0; return; }
  const el = currentViewerElement(); const rect = viewerStage.getBoundingClientRect();
  const limitX = Math.max(0, (el.offsetWidth * viewerView.scale - rect.width) / 2 + 48);
  const limitY = Math.max(0, (el.offsetHeight * viewerView.scale - rect.height) / 2 + 48);
  viewerView.x = clampNumber(viewerView.x, -limitX, limitX);
  viewerView.y = clampNumber(viewerView.y, -limitY, limitY);
}
// Zooms so the point under (focusX, focusY) stays under the finger / cursor.
function zoomViewerAt(nextScale, focusX, focusY, animate = false) {
  const rect = viewerStage.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2;
  const scale = clampNumber(nextScale, 1, 5);
  const anchorX = (focusX - centerX - viewerView.x) / viewerView.scale;
  const anchorY = (focusY - centerY - viewerView.y) / viewerView.scale;
  viewerView.scale = scale;
  viewerView.x = (focusX - centerX) - anchorX * scale;
  viewerView.y = (focusY - centerY) - anchorY * scale;
  clampViewerPan();
  applyViewerTransform(animate);
}

function fitViewerVideo() {
  const width = imageViewerVideo.videoWidth; const height = imageViewerVideo.videoHeight;
  if (!width || !height || imageViewerVideo.hidden) return;
  const compact = window.innerWidth <= 600;
  const maxWidth = Math.min(window.innerWidth - (compact ? 34 : 42), 1280);
  const maxHeight = window.innerHeight - (compact ? 190 : 176);
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  imageViewerVideo.style.width = `${Math.round(width * ratio)}px`;
  imageViewerVideo.style.height = `${Math.round(height * ratio)}px`;
}
function stopViewerVideo() {
  imageViewerVideo.pause();
  if (imageViewerVideo.getAttribute('src')) { imageViewerVideo.removeAttribute('src'); imageViewerVideo.load(); }
}

function showViewerItem(index, direction = 0) {
  const target = viewerItems[index]; if (!target) return;
  viewerIndex = index;
  const token = ++viewerToken;
  const isVideo = target.classList.contains('memory-video');
  const row = target.closest('.memory-row');
  const siblings = row ? [...row.querySelectorAll(MEDIA_SELECTOR)] : [target];
  viewerDate.textContent = row?.querySelector('.date-tag')?.textContent.trim() || '';
  viewerCounter.textContent = `${arabicNumber.format(siblings.indexOf(target) + 1)} / ${arabicNumber.format(siblings.length)}`;
  viewerPrev.disabled = index <= 0;
  viewerNext.disabled = index >= viewerItems.length - 1;
  imageViewer.classList.toggle('is-video', isVideo);

  resetViewerTransform(false);
  imageViewerVideo.pause();
  viewerMediaBox.classList.add('is-switching');
  clearTimeout(spinnerTimer);
  spinnerTimer = setTimeout(() => { if (token === viewerToken) viewerSpinner.hidden = false; }, 160);

  const finish = () => {
    if (token !== viewerToken) return;
    clearTimeout(spinnerTimer); viewerSpinner.hidden = true;
    viewerMediaBox.classList.remove('is-switching');
    if (direction && !reduceMotion.matches) viewerMediaBox.animate(
      [{ opacity:0, transform:`translateX(${direction * 36}px)` }, { opacity:1, transform:'none' }],
      { duration:260, easing:'cubic-bezier(.2,.8,.2,1)' }
    );
    // Warm the next/previous photo so stepping feels instant.
    [index + 1, index - 1].forEach(i => { const near = viewerItems[i]; if (near && near.classList.contains('memory-image')) new Image().src = cloudinaryViewerUrl(near.dataset.fullSrc); });
  };
  const url = cloudinaryViewerUrl(target.dataset.fullSrc);

  if (isVideo) {
    imageViewerImage.hidden = true; imageViewerImage.removeAttribute('src');
    imageViewerVideo.hidden = false;
    imageViewerVideo.style.width = ''; imageViewerVideo.style.height = '';
    imageViewerVideo.onloadedmetadata = () => { if (token !== viewerToken) return; fitViewerVideo(); finish(); imageViewerVideo.play().catch(() => {}); };
    imageViewerVideo.onerror = finish;
    imageViewerVideo.src = url; imageViewerVideo.load();
  } else {
    stopViewerVideo(); imageViewerVideo.hidden = true;
    const probe = new Image();
    const show = src => { if (token !== viewerToken) return; imageViewerImage.hidden = false; imageViewerImage.alt = target.alt || ''; imageViewerImage.src = src; finish(); };
    probe.onload = () => show(url);
    probe.onerror = () => show(target.currentSrc || target.src); // fall back to the thumbnail
    probe.src = url;
  }
}

function openMediaViewer(media) {
  viewerItems = [...memoryWall.querySelectorAll(MEDIA_SELECTOR)];
  const index = viewerItems.indexOf(media); if (index < 0) return;
  viewerIsOpen = true;
  memoryWall.querySelectorAll('video').forEach(video => video.pause());
  document.documentElement.classList.add('viewer-open');
  imageViewer.showModal();
  showViewerItem(index, 0);
}
function stepViewer(delta) {
  const next = viewerIndex + delta;
  if (next < 0 || next >= viewerItems.length) { resetViewerTransform(true); return; }
  showViewerItem(next, delta);
}

imageViewer.addEventListener('close', () => {
  viewerToken++; clearTimeout(spinnerTimer); viewerSpinner.hidden = true;
  stopViewerVideo(); imageViewerImage.removeAttribute('src');
  viewerMediaBox.classList.remove('is-switching');
  resetViewerTransform(false);
  viewerIsOpen = false;
  document.documentElement.classList.remove('viewer-open');
  // Resume the wall videos that are on screen, and leave the rope where the viewer stopped.
  wallVideoObserver.disconnect();
  memoryWall.querySelectorAll('.memory-video').forEach(video => wallVideoObserver.observe(video));
  const last = viewerItems[viewerIndex];
  if (last?.isConnected) {
    last.focus({ preventScroll:true });
    last.closest('.memory')?.scrollIntoView({ inline:'center', block:'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }
});
viewerPrev.addEventListener('click', () => stepViewer(-1));
viewerNext.addEventListener('click', () => stepViewer(1));
window.addEventListener('resize', () => { if (viewerIsOpen) { fitViewerVideo(); clampViewerPan(); applyViewerTransform(false); } });

imageViewer.addEventListener('keydown', event => {
  if (event.target === imageViewerVideo && ['ArrowLeft', 'ArrowRight', ' ', 'Home', 'End'].includes(event.key)) return; // native video controls
  if (event.key === 'ArrowRight') { event.preventDefault(); stepViewer(1); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); stepViewer(-1); }
  else if (event.key === 'Home') { event.preventDefault(); showViewerItem(0, -1); }
  else if (event.key === 'End') { event.preventDefault(); showViewerItem(viewerItems.length - 1, 1); }
  else if (!imageViewerImage.hidden && (event.key === '+' || event.key === '=')) { const r = viewerStage.getBoundingClientRect(); zoomViewerAt(viewerView.scale * 1.4, r.left + r.width / 2, r.top + r.height / 2, true); }
  else if (!imageViewerImage.hidden && (event.key === '-' || event.key === '_')) { const r = viewerStage.getBoundingClientRect(); zoomViewerAt(viewerView.scale / 1.4, r.left + r.width / 2, r.top + r.height / 2, true); }
  else if (event.key === '0') resetViewerTransform(true);
});

/* Gestures: swipe to step, swipe down to close, pinch / double-tap / wheel to zoom, drag to pan. */
const viewerPointers = new Map();
let viewerGesture = null; let viewerMoved = false; let viewerLastTap = { time:0, x:0, y:0 };
viewerStage.addEventListener('pointerdown', event => {
  if (event.target.closest('video') || event.target.closest('button')) return; // leave native video controls alone
  viewerStage.setPointerCapture(event.pointerId);
  viewerPointers.set(event.pointerId, { x:event.clientX, y:event.clientY });
  if (viewerPointers.size === 1) {
    viewerMoved = false;
    viewerGesture = { mode:'pan', startX:event.clientX, startY:event.clientY, baseX:viewerView.x, baseY:viewerView.y, axis:null, downTarget:event.target };
  } else if (viewerPointers.size === 2) {
    const [a, b] = [...viewerPointers.values()];
    viewerGesture = { mode:'pinch', startDistance:Math.hypot(a.x - b.x, a.y - b.y) || 1, startScale:viewerView.scale, midX:(a.x + b.x) / 2, midY:(a.y + b.y) / 2 };
    viewerMoved = true;
  }
});
viewerStage.addEventListener('pointermove', event => {
  if (!viewerPointers.has(event.pointerId)) return;
  viewerPointers.set(event.pointerId, { x:event.clientX, y:event.clientY });
  if (!viewerGesture) return;
  if (viewerGesture.mode === 'pinch' && viewerPointers.size >= 2) {
    const [a, b] = [...viewerPointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    zoomViewerAt(viewerGesture.startScale * (distance / viewerGesture.startDistance), (a.x + b.x) / 2, (a.y + b.y) / 2, false);
    return;
  }
  if (viewerGesture.mode !== 'pan') return;
  const dx = event.clientX - viewerGesture.startX; const dy = event.clientY - viewerGesture.startY;
  if (Math.hypot(dx, dy) > 6) viewerMoved = true;
  if (viewerView.scale > 1.02) {
    viewerView.x = viewerGesture.baseX + dx; viewerView.y = viewerGesture.baseY + dy;
    clampViewerPan(); applyViewerTransform(false);
    return;
  }
  if (!viewerGesture.axis && Math.hypot(dx, dy) > 8) viewerGesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  if (viewerGesture.axis === 'x') { viewerView.x = dx; applyViewerTransform(false); }
  else if (viewerGesture.axis === 'y') { viewerView.y = dy; imageViewer.style.setProperty('--drag-fade', Math.min(Math.abs(dy) / 320, 1)); applyViewerTransform(false); }
});
function endViewerPointer(event) {
  if (!viewerPointers.has(event.pointerId)) return;
  viewerPointers.delete(event.pointerId);
  const gesture = viewerGesture;
  if (gesture?.mode === 'pinch' && viewerPointers.size === 1) {
    const [p] = [...viewerPointers.values()];
    viewerGesture = { mode:'pan', startX:p.x, startY:p.y, baseX:viewerView.x, baseY:viewerView.y, axis:null, downTarget:null };
    if (viewerView.scale < 1.02) resetViewerTransform(true);
    return;
  }
  if (viewerPointers.size > 0) return;
  viewerGesture = null;
  if (!gesture || gesture.mode !== 'pan') { clampViewerPan(); applyViewerTransform(true); return; }
  const dx = event.clientX - gesture.startX; const dy = event.clientY - gesture.startY;

  if (viewerView.scale > 1.02) { clampViewerPan(); applyViewerTransform(true); }
  else if (gesture.axis === 'x' && Math.abs(dx) > 60 && viewerIndex + (dx < 0 ? 1 : -1) >= 0 && viewerIndex + (dx < 0 ? 1 : -1) < viewerItems.length) { stepViewer(dx < 0 ? 1 : -1); return; }
  else if (gesture.axis === 'y' && Math.abs(dy) > 110) { imageViewer.close(); return; }
  else resetViewerTransform(true);

  if (viewerMoved || event.type === 'pointercancel') return;
  const onMedia = gesture.downTarget && gesture.downTarget.closest('#imageViewerImage');
  if (!onMedia) { imageViewer.close(); return; } // tap on the dark background closes
  const now = performance.now();
  if (now - viewerLastTap.time < 320 && Math.hypot(event.clientX - viewerLastTap.x, event.clientY - viewerLastTap.y) < 32) {
    viewerLastTap.time = 0;
    if (viewerView.scale > 1.02) resetViewerTransform(true); else zoomViewerAt(2.6, event.clientX, event.clientY, true);
  } else viewerLastTap = { time:now, x:event.clientX, y:event.clientY };
}
viewerStage.addEventListener('pointerup', endViewerPointer);
viewerStage.addEventListener('pointercancel', endViewerPointer);
viewerStage.addEventListener('wheel', event => {
  if (imageViewerImage.hidden) return;
  event.preventDefault();
  zoomViewerAt(viewerView.scale * Math.exp(-event.deltaY * 0.0018), event.clientX, event.clientY, false);
}, { passive:false });

/* ===== Wall: open viewer, rope arrows, mouse drag-to-scroll ===== */
let wallDrag = null; let suppressWallClick = false;
memoryWall.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  const clips = event.target.closest('.clips');
  if (!clips || event.target.closest('button')) return;
  wallDrag = { clips, startX:event.clientX, startLeft:clips.scrollLeft, active:false };
});
window.addEventListener('pointermove', event => {
  if (!wallDrag) return;
  const dx = event.clientX - wallDrag.startX;
  if (!wallDrag.active && Math.abs(dx) > 6) { wallDrag.active = true; wallDrag.clips.classList.add('is-dragging'); }
  if (wallDrag.active) wallDrag.clips.scrollLeft = wallDrag.startLeft - dx;
});
function endWallDrag() {
  if (!wallDrag) return;
  if (wallDrag.active) { suppressWallClick = true; setTimeout(() => { suppressWallClick = false; }, 0); }
  wallDrag.clips.classList.remove('is-dragging'); wallDrag = null;
}
window.addEventListener('pointerup', endWallDrag);
window.addEventListener('pointercancel', endWallDrag);

memoryWall.addEventListener('click', event => {
  if (suppressWallClick) { event.stopImmediatePropagation(); event.preventDefault(); return; }
  const nav = event.target.closest('.rope-nav');
  if (nav) {
    const clips = nav.closest('.memory-row').querySelector('.clips');
    clips.scrollBy({ left:(nav.classList.contains('rope-next') ? 1 : -1) * clips.clientWidth * .8, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    return;
  }
  const media = event.target.closest(MEDIA_SELECTOR); if (media) openMediaViewer(media);
});
memoryWall.addEventListener('keydown', event => { const media = event.target.closest(MEDIA_SELECTOR); if (media && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openMediaViewer(media); } });
document.querySelector('#writeMessageChoice').addEventListener('click', () => { messagesModal.close(); document.querySelector('#recipientLine').textContent = `الرسالة دي هتوصل لمصطفى بس.`; if (otherPerson()==='Hagar') document.querySelector('#recipientLine').textContent='الرسالة دي هتوصل لهاجر بس.'; document.querySelector('#messageText').value=''; document.querySelector('#messageError').textContent=''; composeModal.showModal(); });
document.querySelector('#composeForm').addEventListener('submit', async event => {
event.preventDefault();
const text=document.querySelector('#messageText').value.trim();
const error=document.querySelector('#messageError');
if (!text) { error.textContent='اكتب رسالة الأول.'; return; }
error.textContent='جاري إرسال الرسالة…';
const messages=readMessages();
messages.push({ id:crypto.randomUUID(), from:currentPerson, to:otherPerson(), text, createdAt:new Date().toISOString(), read:false });
try {
await saveMessages(messages);
error.textContent='';
composeModal.close(); updateUnreadUI(); messagesModal.showModal();
} catch (sendError) {
error.textContent=sendError?.code==='permission-denied' || sendError?.code?.startsWith('auth/') ? 'Firebase مانع الإرسال: فعّل Anonymous وانشر Rules بتاعة Firestore.' : 'الرسالة ما اتبعتتش. تأكد من الإنترنت وجرب تاني.';
}
});
document.querySelector('#readMessagesChoice').addEventListener('click', () => { messagesModal.close(); const messages=readMessages(); const received=messages.filter(message => message.to===currentPerson).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); messages.forEach(message => { if (message.to===currentPerson) message.read=true; }); saveMessages(messages); document.querySelector('#inboxSubheading').textContent = received.length ? `رسايل متبعتة لـ ${personLabel(currentPerson)}.` : `لسه مفيش رسايل — ${personLabel(otherPerson())} يقدر يبعتلك رسالة.`; document.querySelector('#inboxList').innerHTML = received.length ? received.map(message => `<article class="message-note"><small>من ${personLabel(message.from)} · ${new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short'}).format(new Date(message.createdAt))}</small><p>${escapeHtml(message.text).replace(/\n/g,'<br>')}</p></article>`).join('') : '<p class="no-messages">صندوق الرسايل مستني أول كلمة حلوة. ♥</p>'; updateUnreadUI(); inboxModal.showModal(); });
document.querySelector('#secretMessageChoice').addEventListener('click', () => { if (currentPerson !== 'Hagar') return; messagesModal.close(); document.querySelector('#secretPassword').value=''; document.querySelector('#secretPasswordError').textContent=''; secretPasswordModal.showModal(); });
document.querySelector('#secretPasswordForm').addEventListener('submit', event => { event.preventDefault(); if (document.querySelector('#secretPassword').value !== 'mostafaloveshagar') { document.querySelector('#secretPasswordError').textContent='متحاوليش طالما أنا مقولتلكيش الباسوورد.'; return; } const defaultLetter='صباح العسل \nبما اني قولتلك ع الباسوورد يبقى اكيد قولتلك اني بحبك        .\nف بالمرة حابب احكيلك اني من اول لحظة كلمتك وانا مشدودلك اكتر من حاجة حصلتلي ف حياتي وفضلي اعجابي بيكي يزيد لحد اول يوم شوفتك ف الحقيقة لحظتها انبهرت جدا ان ممكن يكون في بنت بالجمال ده وبعد ما خرجنا وروحتك كنت ساعتها فعلا عرفت اني بحبك بجد رغم المدة القصيرة اللي عرفتك فيها بس ده اللي حصل محدش ليه ع قلبه سلطان بقى  '; const letter=defaultLetter; document.querySelector('#secretLetterContent').innerHTML=escapeHtml(letter).replace(/\n/g,'<br>'); const envelope=document.querySelector('#secretMessageModal .secret-envelope'); envelope.classList.remove('letter-ready'); secretPasswordModal.close(); secretMessageModal.showModal(); setTimeout(() => envelope.classList.add('letter-ready'),3000); });
addButton.addEventListener('click', () => { document.querySelector('#memoryDate').value = new Date().toISOString().slice(0,10); document.querySelector('#uploadBox').innerHTML='اضغطوا هنا لاختيار الملفات <small>ينفع تختاروا أكتر من صورة أو فيديو.</small>'; document.querySelector('#uploadProgress').hidden=true; memoryModal.showModal(); });
document.querySelector('#memoryFiles').addEventListener('change', (event) => { const n=event.target.files.length; document.querySelector('#uploadBox').innerHTML = n ? `تم اختيار ${n} ملف ✨ <small>اضغطوا لو عايزين تغيّروهم.</small>` : 'اضغطوا هنا لاختيار الملفات <small>ينفع تختاروا أكتر من صورة أو فيديو.</small>'; document.querySelector('#uploadProgress').hidden=true; });
document.querySelector('#memoryForm').addEventListener('submit', async (event) => {
event.preventDefault(); const date=document.querySelector('#memoryDate').value; const files=[...document.querySelector('#memoryFiles').files]; const error=document.querySelector('#memoryError'); const submit=document.querySelector('#memorySubmit'); error.textContent='';
if (!date || !files.length) { error.textContent='اختاروا التاريخ والملفات الأول.'; return; }
prepareUploadProgress(files); document.querySelector('#uploadStatus').textContent='جاري رفع الملفات…'; submit.disabled=true; const originalButtonText=submit.textContent; submit.textContent='جاري الرفع…'; const loadedByFile=[]; const states=[];
try { const items=[]; for (let index=0; index<files.length; index++) { const file=files[index]; states[index]='uploading'; updateUploadProgress(files,loadedByFile,states); items.push(await fileToItem(file,(loaded,total)=>{ loadedByFile[index]=file.size*(loaded/total); updateUploadProgress(files,loadedByFile,states); })); loadedByFile[index]=file.size; states[index]='success'; updateUploadProgress(files,loadedByFile,states); } document.querySelector('#uploadStatus').textContent='جاري حفظ الذكرى…'; const all=readMemories(); const existing=all.find(group=>group.date===date); if(existing) existing.items.push(...items); else all.push({date,items}); await saveMemories(all); document.querySelector('#uploadStatus').textContent='تم حفظ الذكرى بنجاح'; renderWall(); memoryModal.close(); event.target.reset(); } catch (saveError) { const failedIndex=states.findIndex(state=>state==='uploading'); if (failedIndex >= 0) states[failedIndex]='error'; updateUploadProgress(files,loadedByFile,states); document.querySelector('#uploadStatus').textContent='تعذّر إكمال الرفع'; error.textContent=saveError?.code==='permission-denied' || saveError?.code?.startsWith('auth/') ? 'Firebase مانع الحفظ: فعّلوا Anonymous في Authentication وانشروا Rules بتاعة Firestore.' : saveError?.name==='QuotaExceededError' ? 'مساحة الحفظ على المتصفح قربت تتملي. جرّبوا صور أقل أو أصغر.' : 'حصلت مشكلة أثناء رفع أو حفظ الملفات. جرّبوا تاني.'; } finally { submit.disabled=false; submit.textContent=originalButtonText; }
});
memoryWall.addEventListener('click', async (event) => {
const button = event.target.closest('button'); if (!button || !loggedIn) return;
const all = readMemories(); const date = button.dataset.date;
if (button.classList.contains('group-delete')) { if (!confirm('متأكدين إنكم عايزين تمسحوا اليوم ده بكل صوره وفيديوهاته؟')) return; saveMemories(all.filter(group => group.date !== date)); renderWall(); return; }
const group = all.find(entry => entry.date === date); const index = Number(button.dataset.index); if (!group || Number.isNaN(index)) return;
if (button.classList.contains('delete-media')) { if (!confirm('تمسحوا الذكرى دي؟')) return; group.items.splice(index,1); if (!group.items.length) all.splice(all.indexOf(group),1); saveMemories(all); renderWall(); return; }
if (button.classList.contains('replace-media')) { const picker=document.createElement('input'); picker.type='file'; picker.accept='image/*,video/*'; picker.onchange=async()=> { const file=picker.files[0]; if (!file) return; try { group.items[index]=await fileToItem(file); saveMemories(all); renderWall(); } catch { alert('حصلت مشكلة أثناء تغيير الملف.'); } }; picker.click(); }
});
lightSwitch.addEventListener('click', () => { const on=document.body.classList.toggle('lights-on'); lightSwitch.setAttribute('aria-pressed',on); lightSwitch.setAttribute('aria-label',on?'اطفي الأنوار':'شغّل الأنوار'); });
onSnapshot(memoriesDocument, snapshot => {
const groups=snapshot.data()?.groups;
if (!Array.isArray(groups)) return;
localStorage.setItem(STORAGE_KEY,JSON.stringify(groups));
renderWall();
}, error => console.warn('Could not read memories from Firebase:', error));
onSnapshot(messagesDocument, snapshot => {
const items=snapshot.data()?.items;
if (!Array.isArray(items)) return;
localStorage.setItem(MESSAGE_STORAGE_KEY,JSON.stringify(items));
updateUnreadUI();
}, error => console.warn('Could not read messages from Firebase:', error));

setupReplyInbox();
updateAuthUI(); renderWall();
updateLoveCounter();
