// One clock drives everything: the scenery, the train's stop, the messages and the Arabic line.
const routeEl = document.querySelector('#route');
const messageEl = document.querySelector('#journeyMessage');
const statusEl = document.querySelector('#journeyStatus');
const foreverEl = document.querySelector('#forever');
const stationEls = [...document.querySelectorAll('.station')];
const farEl = document.querySelector('#far');
const nearEl = document.querySelector('#near');
const tiesEl = document.querySelector('#ties');
const gateEl = document.querySelector('#gate');
const ticketEl = document.querySelector('#ticket');
const boardBtn = document.querySelector('#boardBtn');
const validEl = document.querySelector('#validCorner');

const DISTANCE = 1300;   // px between the two stations
const START = .8;        // seconds before the train leaves
const TRAVEL = 7.5;      // seconds to reach "Where Love began"
const HOLD = 3;          // seconds the train waits at the station
const CRUISE = 280;      // px/s after leaving the station
const RAMP = 2.5;        // seconds to reach cruising speed
const DEPART = START + TRAVEL + HOLD;

const ease = p => (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
function positionAt(t) {
  if (t < START) return 0;
  const a = t - START;
  if (a < TRAVEL) return DISTANCE * ease(a / TRAVEL);
  const s = a - TRAVEL - HOLD;
  if (s < 0) return DISTANCE;
  if (s < RAMP) return DISTANCE + (CRUISE * s * s) / (2 * RAMP);
  return DISTANCE + CRUISE * (s - RAMP / 2);
}

const moments = [
  { at: 0, text: 'النهاردة أول مرة أشوفك وكنتي زي القمر.', label: 'سايبين محطة أول مرة شوفتك…' },
  { at: START + TRAVEL - 2.8, text: 'النهاردة أحلى يوم ف حياتي لما قولتيلي بحبك', label: 'داخلين على محطة بداية حبنا لبعض…' },
  { at: START + TRAVEL, text: 'النهاردة أحلى يوم ف حياتي لما قولتيلي بحبك.', label: 'واقفين في محطة بداية حبنا لبعض · ٢٨ سبتمبر' },
  { at: DEPART, text: 'مفيش محطة أخيرة. إحنا مع بعض دايماً.', label: 'في طريقنا لمحطة سوا للأبد…' }
];
const FOREVER_AT = DEPART + 2.2;
let shownMoment = -1;

function render(t) {
  const pos = positionAt(t);
  stationEls.forEach(el => { el.style.transform = `translateX(${Number(el.dataset.at) - pos}px)`; });
  farEl.style.transform = `translateX(${-((pos * .12) % 900)}px)`;
  nearEl.style.transform = `translateX(${-((pos * .3) % 700)}px)`;
  tiesEl.style.transform = `translateX(${-(pos % 40)}px)`;
  routeEl.classList.toggle('stopped', t >= START + TRAVEL && t < DEPART);
  routeEl.classList.toggle('at-love', t >= START + TRAVEL - 2.5 && t < DEPART + 1.5);
  foreverEl.classList.toggle('show', t >= FOREVER_AT);
  validEl.classList.toggle('show', t >= FOREVER_AT + 2.5);
  let index = 0;
  moments.forEach((moment, i) => { if (t >= moment.at) index = i; });
  if (index !== shownMoment) {
    shownMoment = index;
    messageEl.textContent = moments[index].text;
    statusEl.textContent = moments[index].label;
  }
}

// A scattered night sky instead of an even grid.
const starsEl = document.querySelector('#stars');
for (let i = 0; i < 90; i++) {
  const star = document.createElement('i');
  const size = 1 + Math.random() * 1.8;
  star.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 65}%;width:${size}px;height:${size}px;--d:${(3 + Math.random() * 4).toFixed(1)}s;--s:-${(Math.random() * 6).toFixed(1)}s;opacity:${(.3 + Math.random() * .5).toFixed(2)}`;
  starsEl.append(star);
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A short steam-whistle made with the browser's audio; it only works after a tap, which is why there is a button.
function whistle() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(), now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(.16, now + .08);
    gain.gain.setValueAtTime(.16, now + .7);
    gain.gain.linearRampToValueAtTime(0, now + 1.3);
    [392, 494].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.04, now + .3);
      osc.connect(gain); osc.start(now); osc.stop(now + 1.35);
    });
    setTimeout(() => ctx.close(), 1600);
  } catch (error) { /* sound is optional */ }
}

function startJourney() {
  if (reduced) {
    render(DEPART - .01);
    routeEl.classList.remove('at-love'); routeEl.classList.add('stopped');
    messageEl.textContent = moments[3].text; statusEl.textContent = moments[3].label;
    foreverEl.classList.add('show'); validEl.classList.add('show');
    return;
  }
  const begin = performance.now() + 500;
  const frame = now => { render(Math.max(0, (now - begin) / 1000)); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}

// Before boarding, the scene waits quietly behind the ticket.
render(0);
routeEl.classList.add('stopped');
boardBtn.addEventListener('click', () => {
  boardBtn.disabled = true;
  whistle();
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  ticketEl.classList.add('punched');
  setTimeout(() => {
    gateEl.classList.add('leaving');
    document.body.classList.remove('gated');
    startJourney();
  }, reduced ? 0 : 1000);
  setTimeout(() => { gateEl.hidden = true; }, reduced ? 0 : 2600);
});
boardBtn.focus({ preventScroll: true });
