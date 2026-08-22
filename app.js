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
const CLOUDINARY_CLOUD_NAME = 'klxrsmyj';
const CLOUDINARY_UPLOAD_PRESET = 'hagar_mostafa_memories';

const STORAGE_KEY = 'hagar-mostafa-memory-wall-v1';
const MESSAGE_STORAGE_KEY = 'hagar-mostafa-private-messages-v1';
const SECRET_MESSAGE_STORAGE_KEY = 'hagar-secret-message-v1';
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
let currentPerson = sessionStorage.getItem('memoryWallPerson') || '';
let loggedIn = sessionStorage.getItem('memoryWallLoggedIn') === 'true' && Boolean(currentPerson);

const demoMemories = [];
function readMemories() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? demoMemories; } catch { return demoMemories; } }
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
function readFileAsDataUrl(file) { return new Promise((resolve,reject)=> { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file); }); }
function compressImage(file) { return new Promise((resolve,reject) => { const image = new Image(); const source = URL.createObjectURL(file); image.onload = () => { const maxEdge=1100; const scale=Math.min(1,maxEdge/Math.max(image.naturalWidth,image.naturalHeight)); const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(image.naturalWidth*scale)); canvas.height=Math.max(1,Math.round(image.naturalHeight*scale)); const context=canvas.getContext('2d'); context.drawImage(image,0,0,canvas.width,canvas.height); URL.revokeObjectURL(source); resolve(canvas.toDataURL('image/jpeg',.74)); }; image.onerror=()=>{ URL.revokeObjectURL(source); reject(new Error('image-read-failed')); }; image.src=source; }); }
async function uploadToCloudinary(file, type) {
  const formData=new FormData();
  formData.append('file',file);
  formData.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder','hagar-mostafa');
  const response=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`,{method:'POST',body:formData});
  const result=await response.json();
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'cloud-upload-failed');
  return result.secure_url;
}
async function fileToItem(file) { const type=file.type.startsWith('video/')?'video':'image'; const data=await uploadToCloudinary(file,type); return {type,data,name:file.name.replace(/\.[^/.]+$/, '').slice(0,28)}; }
function updateLoveCounter() { const firstDay = new Date(2026, 7, 15); const today = new Date(); firstDay.setHours(0,0,0,0); today.setHours(0,0,0,0); const days = Math.max(0, Math.floor((today - firstDay) / 86400000)); document.querySelector('#daysTogether').textContent = new Intl.NumberFormat('ar-EG').format(days); document.querySelector('#daysWord').textContent = days >= 3 && days <= 10 ? 'أيام' : 'يوم'; }

function renderWall() {
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
      const safeName = escapeHtml(item.name || 'ذكرى جميلة');
      card.innerHTML = `${loggedIn ? `<div class="memory-controls"><button type="button" class="replace-media" data-date="${group.date}" data-index="${itemIndex}" title="غيّر الملف">↻</button><button type="button" class="delete-media" data-date="${group.date}" data-index="${itemIndex}" title="امسح الملف">×</button></div>` : ''}<div class="media-wrap">${item.type === 'video' ? `<video src="${item.data}" autoplay muted loop playsinline preload="metadata" disablepictureinpicture></video>` : `<img src="${item.data}" alt="${safeName}" loading="lazy">`}</div>`;
      clips.append(card);
    });
    const rope = row.querySelector('.rope');
    const buildContinuousRope = () => {
      const ropeWidth = Math.max(clips.scrollWidth, clips.clientWidth);
      const bulbCount = Math.max(5,Math.ceil(ropeWidth/165)); const waveSize=118; let pathData='M 0 20';
      for (let x=5; x<=ropeWidth; x+=5) { const y=20+Math.sin((x/waveSize)*Math.PI*2)*5.4+Math.sin((x/(waveSize*2))*Math.PI*2+.7)*1.8; pathData+=` L ${x} ${y}`; }
      const lights=Array.from({length:bulbCount},(_,index)=>`<span class="light-cast"></span><span class="bulb"></span>`).join('');
      rope.innerHTML=`<svg viewBox="0 0 ${ropeWidth} 45" preserveAspectRatio="xMinYMid meet" aria-hidden="true"><path d="${pathData}"/></svg>${lights}`;
      const path=rope.querySelector('path'); const totalLength=path.getTotalLength(); const bulbs=[...rope.querySelectorAll('.bulb')]; const casts=[...rope.querySelectorAll('.light-cast')];
      bulbs.forEach((bulb,index) => {
        const targetX=ropeWidth*((index+.5)/bulbs.length); let closest=path.getPointAtLength(0); let smallest=Infinity;
        for (let step=0; step<=420; step++) { const point=path.getPointAtLength(totalLength*step/420); const distance=Math.abs(point.x-targetX); if(distance<smallest) { smallest=distance; closest=point; } }
        const x=`${(closest.x/ropeWidth)*100}%`; const y=`${closest.y+6}px`; bulb.style.left=x; bulb.style.right='auto'; bulb.style.top=y; bulb.style.transform='translateX(-50%)'; casts[index].style.left=x; casts[index].style.right='auto'; casts[index].style.top=`${closest.y+15}px`;
      });
    };
    const positionBulbsOnRope = () => {
      if (!rope.querySelector('path')) return;
      const path=rope.querySelector('path'); const totalLength=path.getTotalLength(); const bulbs=[...rope.querySelectorAll('.bulb')]; const casts=[...rope.querySelectorAll('.light-cast')]; const ropeWidth=Math.max(clips.scrollWidth,clips.clientWidth);
      bulbs.forEach((bulb,index) => {
        const targetX=ropeWidth*((index+.5)/bulbs.length); let closest=path.getPointAtLength(0); let smallest=Infinity;
        for (let step=0; step<=420; step++) { const point=path.getPointAtLength(totalLength*step/420); const distance=Math.abs(point.x-targetX); if(distance<smallest) { smallest=distance; closest=point; } }
        const x=`${(closest.x/ropeWidth)*100}%`; bulb.style.left=x; bulb.style.top=`${closest.y+6}px`; casts[index].style.left=x; casts[index].style.top=`${closest.y+15}px`;
      });
    };
    const hangMemoriesOnRope = () => {
      const path=rope.querySelector('path'); if (!path) return;
      const totalLength=path.getTotalLength(); const ropeWidth=Math.max(clips.scrollWidth,clips.clientWidth);
      clips.querySelectorAll('.memory').forEach(card => {
        const targetX=card.offsetLeft+(card.offsetWidth/2); let closest=path.getPointAtLength(0); let smallest=Infinity;
        for (let step=0; step<=420; step++) { const point=path.getPointAtLength(totalLength*step/420); const distance=Math.abs(point.x-targetX); if(distance<smallest) { smallest=distance; closest=point; } }
        const desiredTop=rope.offsetTop+closest.y+20; const currentTop=clips.offsetTop+card.offsetTop;
        card.style.setProperty('--hang-offset',`${desiredTop-currentTop}px`);
      });
    };
    const syncRope = () => {
      row.style.setProperty('--rope-width', `${Math.max(clips.scrollWidth,clips.clientWidth)}px`);
      row.style.setProperty('--rope-shift', `${-clips.scrollLeft}px`);
    };
    clips.addEventListener('scroll', syncRope, { passive:true });
    const makeInfiniteStrip = () => {
      const originalCards=[...clips.querySelectorAll('.memory')];
      if (!originalCards.length || clips.clientWidth < 20 || originalCards[0].offsetWidth < 10) return 0;
      let firstCopy;
      // Keep adding identical rounds until one complete round can leave the screen unseen.
      do {
        const copy=originalCards.map(card => card.cloneNode(true));
        if (!firstCopy) firstCopy=copy[0];
        copy.forEach(card => clips.append(card));
      } while (clips.scrollWidth < clips.clientWidth * 3);
      return firstCopy.offsetLeft - originalCards[0].offsetLeft;
    };
    const startInfiniteLoop = loopWidth => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || loopWidth < 3) return;
      const direction = groupIndex % 2 === 0 ? -1 : 1;
      let paused=false, lastTime=performance.now();
      clips.style.overflowX='scroll';
      clips.style.scrollBehavior='auto';
      clips.scrollLeft=direction < 0 ? loopWidth : 0;
      const move = now => {
        if (!row.isConnected) return;
        const elapsed=Math.min(40,now-lastTime); lastTime=now;
        if (!paused) {
          clips.scrollLeft += direction * elapsed * .04;
          if (direction > 0 && clips.scrollLeft >= loopWidth) clips.scrollLeft -= loopWidth;
          if (direction < 0 && clips.scrollLeft <= 0) clips.scrollLeft += loopWidth;
        }
        requestAnimationFrame(move);
      };
      clips.addEventListener('pointerdown', () => { paused=true; });
      const resume=() => { paused=false; lastTime=performance.now(); };
      clips.addEventListener('pointerup',resume); clips.addEventListener('pointercancel',resume);
      requestAnimationFrame(move);
    };
    memoryWall.append(row);
    // Manual only: the whole rope and its photos follow the user's swipe.
    requestAnimationFrame(() => { syncRope(); buildContinuousRope(); positionBulbsOnRope(); hangMemoriesOnRope(); });
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
document.querySelector('#secretPasswordForm').addEventListener('submit', event => { event.preventDefault(); if (document.querySelector('#secretPassword').value !== 'mostafaloveshagar') { document.querySelector('#secretPasswordError').textContent='متحاوليش طالما أنا مقولتلكيش الباسوورد.'; return; } const defaultLetter='صباح العسل \nبما اني قولتلك ع الباسوورد يبقى اكيد قولتلك اني بحبك        .\nف بالمرة حابب احكيلك اني من اول لحظة كلمتك وانا مشدودلك اكتر من حاجة حصلتلي ف حياتي وفضلي اعجابي بيكي يزيد لحد اول بوم شوفتك ف الحقيقة لحظتها انبهرت جدا ان ممكن يكون في بنت بالجمال ده وبعد ما خرجنا وروحتك كنت ساعتها فعلا عرفت اني بحبك بجد رغم المدة القصيرة اللي عرفتك فيها بس ده اللي حصل محدش ليه ع قلبه سلطان بقى  '; const letter=defaultLetter; localStorage.setItem(SECRET_MESSAGE_STORAGE_KEY,letter); document.querySelector('#secretLetterContent').innerHTML=escapeHtml(letter).replace(/\n/g,'<br>'); const envelope=document.querySelector('#secretMessageModal .secret-envelope'); envelope.classList.remove('letter-ready'); secretPasswordModal.close(); secretMessageModal.showModal(); setTimeout(() => envelope.classList.add('letter-ready'),3000); });
addButton.addEventListener('click', () => { document.querySelector('#memoryDate').value = new Date().toISOString().slice(0,10); document.querySelector('#uploadBox').innerHTML='اضغطوا هنا لاختيار الملفات <small>ينفع تختاروا أكتر من صورة أو فيديو.</small>'; memoryModal.showModal(); });
document.querySelector('#memoryFiles').addEventListener('change', (event) => { const n=event.target.files.length; document.querySelector('#uploadBox').innerHTML = n ? `تم اختيار ${n} ملف ✨ <small>اضغطوا لو عايزين تغيّروهم.</small>` : 'اضغطوا هنا لاختيار الملفات <small>ينفع تختاروا أكتر من صورة أو فيديو.</small>'; });
document.querySelector('#memoryForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const date=document.querySelector('#memoryDate').value; const files=[...document.querySelector('#memoryFiles').files]; const error=document.querySelector('#memoryError'); error.textContent='';
  if (!date || !files.length) { error.textContent='اختاروا التاريخ والملفات الأول.'; return; }
  try { const items = await Promise.all(files.map(fileToItem)); const all=readMemories(); const existing=all.find(group=>group.date===date); if(existing) existing.items.push(...items); else all.push({date,items}); await saveMemories(all); renderWall(); memoryModal.close(); event.target.reset(); } catch (saveError) { error.textContent=saveError?.code==='permission-denied' || saveError?.code?.startsWith('auth/') ? 'Firebase مانع الحفظ: فعّلوا Anonymous في Authentication وانشروا Rules بتاعة Firestore.' : saveError?.name==='QuotaExceededError' ? 'مساحة الحفظ على المتصفح قربت تتملي. جرّبوا صور أقل أو أصغر.' : 'حصلت مشكلة أثناء رفع أو حفظ الملفات. جرّبوا تاني.'; }
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

updateAuthUI(); renderWall();
updateLoveCounter();
