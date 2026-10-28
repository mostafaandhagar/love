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
async function fileToItem(file, onProgress=()=>{}) { const type=file.type.startsWith('video/')?'video':'image'; const data=await uploadToCloudinary(file,type,onProgress); return {type,data,name:file.name.replace(/\.[^/.]+$/, '').slice(0,28)}; }

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
function cloudinaryDisplayUrl(url) {
return url.includes('res.cloudinary.com/') && url.includes('/upload/') ? url.replace('/upload/','/upload/f_auto,q_auto:good,c_fill,g_auto,w_520,h_520/') : url;
}
function cloudinaryViewerUrl(url) {
return url.includes('res.cloudinary.com/') && url.includes('/upload/') ? url.replace('/upload/','/upload/f_auto,q_auto:good,c_limit,w_1000,h_1000/') : url;
}

const ROPE_WAVE = 118;
const ropeY = x => 20 + Math.sin((x / ROPE_WAVE) * Math.PI * 2) * 5.4 + Math.sin((x / (ROPE_WAVE * 2)) * Math.PI * 2 + .7) * 1.8;
const ropeLayouts = new WeakMap(); const pendingRopes = new Set(); let ropeFrame = 0;
const ropeObserver = new ResizeObserver(entries => {
entries.forEach(entry => pendingRopes.add(entry.target));
if (ropeFrame) return;
ropeFrame = requestAnimationFrame(() => { ropeFrame = 0; pendingRopes.forEach(target => ropeLayouts.get(target)?.()); pendingRopes.clear(); });
});
function renderWall() {
ropeObserver.disconnect(); pendingRopes.clear();
const memories = readMemories().sort((a,b) => b.date.localeCompare(a.date));
memoryWall.innerHTML = '';
emptyState.hidden = memories.length !== 0;
memories.forEach((group, groupIndex) => {
const row = document.createElement('article'); row.className = 'memory-row'; row.style.setProperty('--tilt', `${groupIndex % 2 ? '.4deg' : '-.35deg'}`);
row.innerHTML = `<div class="date-tag">${dateLabel(group.date)}</div>${loggedIn ? `<button class="group-delete" type="button" data-date="${group.date}" title="امسح اليوم ده">مسح اليوم</button>` : ''}<div class="rope"></div><div class="clips"></div>`;
const clips = row.querySelector('.clips');
group.items.forEach((item, itemIndex) => {
if (!item || typeof item.data !== 'string' || !item.data.trim()) return;
const card = document.createElement('figure'); card.className='memory'; card.style.setProperty('--rotation', `${[-3,2,-1.5,3,-2,1][itemIndex % 6]}deg`);
const safeName = escapeHtml(item.name || 'ذكرى جميلة'); const displayUrl=cloudinaryDisplayUrl(item.data);
card.innerHTML = `${loggedIn ? `<div class="memory-controls"><button type="button" class="replace-media" data-date="${group.date}" data-index="${itemIndex}" title="غيّر الملف">↻</button><button type="button" class="delete-media" data-date="${group.date}" data-index="${itemIndex}" title="امسح الملف">×</button></div>` : ''}<div class="media-wrap">${item.type === 'video' ? `<video class="memory-video" src="${item.data}" data-full-src="${item.data}" autoplay muted loop playsinline preload="metadata" disablepictureinpicture role="button" tabindex="0" aria-label="افتح الفيديو بالحجم الكبير"></video>` : `<img class="memory-image" src="${displayUrl}" data-full-src="${item.data}" alt="${safeName}" loading="lazy" decoding="async" width="520" height="520" role="button" tabindex="0" aria-label="افتح الصورة بالحجم الكامل">`}</div>`;
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
function openMediaViewer(media) { const isVideo=media.classList.contains('memory-video'); imageViewerImage.hidden=isVideo; imageViewerVideo.hidden=!isVideo; if (isVideo) { imageViewerVideo.src=cloudinaryViewerUrl(media.dataset.fullSrc); imageViewerVideo.play().catch(()=>{}); } else { imageViewerImage.src=cloudinaryViewerUrl(media.dataset.fullSrc); imageViewerImage.alt=media.alt; } imageViewer.showModal(); }
memoryWall.addEventListener('click', event => { const media=event.target.closest('.memory-image,.memory-video'); if (media) openMediaViewer(media); });
memoryWall.addEventListener('keydown', event => { const media=event.target.closest('.memory-image,.memory-video'); if (media && (event.key==='Enter' || event.key===' ')) { event.preventDefault(); openMediaViewer(media); } });
imageViewer.addEventListener('click', event => { if (event.target===imageViewer) imageViewer.close(); });
imageViewer.addEventListener('close', () => { imageViewerVideo.pause(); imageViewerVideo.removeAttribute('src'); imageViewerVideo.load(); });
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
document.querySelector('#secretPasswordForm').addEventListener('submit', event => { event.preventDefault(); if (document.querySelector('#secretPassword').value !== 'mostafaloveshagar') { document.querySelector('#secretPasswordError').textContent='متحاوليش طالما أنا مقولتلكيش الباسوورد.'; return; } const defaultLetter='صباح العسل \nبما اني قولتلك ع الباسوورد يبقى اكيد قولتلك اني بحبك        .\nف بالمرة حابب احكيلك اني من اول لحظة كلمتك وانا مشدودلك اكتر من حاجة حصلتلي ف حياتي وفضلي اعجابي بيكي يزيد لحد اول بوم شوفتك ف الحقيقة لحظتها انبهرت جدا ان ممكن يكون في بنت بالجمال ده وبعد ما خرجنا وروحتك كنت ساعتها فعلا عرفت اني بحبك بجد رغم المدة القصيرة اللي عرفتك فيها بس ده اللي حصل محدش ليه ع قلبه سلطان بقى  '; const letter=defaultLetter; document.querySelector('#secretLetterContent').innerHTML=escapeHtml(letter).replace(/\n/g,'<br>'); const envelope=document.querySelector('#secretMessageModal .secret-envelope'); envelope.classList.remove('letter-ready'); secretPasswordModal.close(); secretMessageModal.showModal(); setTimeout(() => envelope.classList.add('letter-ready'),3000); });
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
