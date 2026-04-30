// ─── STATE ───────────────────────────────────────────────────────────────────
let aCtx, masterGain;
let gameStarted = false;
let startTime = 0, endTime = 0;
let otpAttempts = 0, payFails = 0, berthsMissed = 0;
let globalTimerInterval;

// ─── AUDIO SYSTEM ────────────────────────────────────────────────────────────
function initAudio() {
  if(!aCtx){
    aCtx=new(window.AudioContext||window.webkitAudioContext)();
    masterGain=aCtx.createGain();
    masterGain.gain.value=0.3;
    masterGain.connect(aCtx.destination);
  }
  if(aCtx.state==='suspended') aCtx.resume();
}

function playTick() {
  if(!aCtx) return;
  const o = aCtx.createOscillator(), g = aCtx.createGain();
  o.type = 'square'; o.frequency.value = 800;
  g.gain.setValueAtTime(0.1, aCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, aCtx.currentTime+0.05);
  o.connect(g); g.connect(masterGain);
  o.start(); o.stop(aCtx.currentTime+0.05);
}

function playHeartbeat() {
  if(!aCtx) return;
  const o = aCtx.createOscillator(), g = aCtx.createGain();
  o.type = 'sine'; o.frequency.value = 60;
  g.gain.setValueAtTime(0.5, aCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, aCtx.currentTime+0.3);
  o.connect(g); g.connect(masterGain);
  o.start(); o.stop(aCtx.currentTime+0.3);
}

function playTrombone() {
  if(!aCtx) return;
  const ctx = aCtx;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(300, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(250, ctx.currentTime+0.4);
  o.frequency.setValueAtTime(250, ctx.currentTime+0.4);
  o.frequency.linearRampToValueAtTime(200, ctx.currentTime+0.8);
  o.frequency.setValueAtTime(200, ctx.currentTime+0.8);
  o.frequency.linearRampToValueAtTime(100, ctx.currentTime+1.5);
  g.gain.setValueAtTime(0.3, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime+1.5);
  o.connect(g); g.connect(masterGain);
  o.start(); o.stop(ctx.currentTime+1.5);
}

function playCrash() {
  if(!aCtx) return;
  const ctx = aCtx;
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0; i<bufferSize; i++) data[i] = Math.random()*2-1;
  const noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
  noise.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 200;
  g.gain.setValueAtTime(0.8, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+2);
  noise.connect(filter); filter.connect(g); g.connect(masterGain);
  noise.start();

  const sub = ctx.createOscillator(), sg = ctx.createGain();
  sub.type = 'square'; sub.frequency.value = 40;
  sg.gain.setValueAtTime(0.5, ctx.currentTime); sg.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+2);
  sub.connect(sg); sg.connect(masterGain);
  sub.start(); sub.stop(ctx.currentTime+2);
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3000);
}

function showLoading(text) {
  document.getElementById('loading-overlay').classList.add('active');
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-text').style.display = 'block';
  document.getElementById('loading-error').style.display = 'none';
  document.getElementById('btn-retry-loading').style.display = 'none';
  document.querySelector('.spinner').style.display = 'block';
}
function hideLoading() { document.getElementById('loading-overlay').classList.remove('active'); }

function showErrorLoading(msg) {
  document.querySelector('.spinner').style.display = 'none';
  document.getElementById('loading-text').style.display = 'none';
  const err = document.getElementById('loading-error');
  err.textContent = msg; err.style.display = 'block';
  document.getElementById('btn-retry-loading').style.display = 'block';
}

function random503() {
  if(!gameStarted) return false;
  if(Math.random() < 0.15) { // 15% chance
    document.getElementById('server-503').style.display = 'flex';
    setTimeout(()=>document.getElementById('server-503').style.display = 'none', 1500);
    return true;
  }
  return false;
}

// Ensure all clicks have 503 chance
document.body.addEventListener('click', (e) => {
  if(e.target.tagName==='BUTTON' || e.target.classList.contains('train-class') || e.target.classList.contains('berth')){
    if(e.target.id!=='btn-start-tatkal' && e.target.id!=='btn-retry-loading' && !e.target.classList.contains('close-ad')) {
      if(random503()) e.stopPropagation();
    }
  }
}, true);

// ─── STEP 0: HOME / START ────────────────────────────────────────────────────
let startCountdown = 5;
const startTimerEl = document.getElementById('start-timer');
const startBtn = document.getElementById('btn-start-tatkal');

const sTimer = setInterval(() => {
  startCountdown--;
  startTimerEl.textContent = `00:0${startCountdown}`;
  if(startCountdown <= 0) {
    clearInterval(sTimer);
    startTimerEl.style.display = 'none';
    startBtn.disabled = false;
    document.querySelector('.blink-text').textContent = "TATKAL IS NOW OPEN!";
  }
}, 1000);

startBtn.addEventListener('click', () => {
  initAudio();
  gameStarted = true;
  startTime = Date.now();
  
  // Start global timer (10:00:00 -> 10:15:00)
  const gTimerEl = document.getElementById('global-timer');
  gTimerEl.style.display = 'block';
  let gTime = 10 * 3600; // 10:00:00 in seconds
  globalTimerInterval = setInterval(() => {
    gTime++; // fake clock moving forward
    const h = Math.floor(gTime/3600), m = Math.floor((gTime%3600)/60), s = gTime%60;
    gTimerEl.textContent = `${h}:${m<10?'0':''}${m}:${s<10?'0':''}${s}`;
    if(gTime > 10*3600 + 300) gTimerEl.classList.add('danger'); // after 5 min
    playTick();
  }, 1000);

  // Popups
  setTimeout(()=>document.getElementById('ad-1').style.display='block', 8000);
  setTimeout(()=>document.getElementById('ad-2').style.display='block', 20000);

  showScreen('step-1');
  showToast("GO GO GO!");
});

// ─── STEP 1: TRAIN LIST ──────────────────────────────────────────────────────
document.getElementById('btn-search-trains').addEventListener('click', () => {
  showLoading("SEARCHING TRAINS...");
  setTimeout(() => {
    hideLoading();
    document.getElementById('train-list').style.display = 'block';
  }, 2500);
});

window.trainError = function() {
  alert("IRCTC: This train is not eligible for Tatkal booking, dear passenger.");
};

document.getElementById('btn-select-tatkal').addEventListener('click', () => {
  showLoading("CHECKING AVAILABILITY...");
  setTimeout(() => { hideLoading(); generateBerthMap(); showScreen('step-2'); }, 1500);
});

// ─── STEP 2: SEATS ───────────────────────────────────────────────────────────
function generateBerthMap() {
  const map = document.getElementById('berth-map');
  map.innerHTML = '';
  // 45 berths. Only 3 avail.
  const availIndexes = [12, 27, 41];
  for(let i=0; i<45; i++) {
    const b = document.createElement('div');
    b.className = 'berth';
    b.textContent = i+1;
    if(availIndexes.includes(i)) {
      b.classList.add('avail');
      b.onclick = () => handleBerthClick(b);
    } else {
      b.classList.add(Math.random()>0.3?'booked':'wl');
    }
    map.appendChild(b);
  }
}

function handleBerthClick(el) {
  showLoading("BOOKING BERTH...");
  setTimeout(() => {
    if(berthsMissed < 2) {
      berthsMissed++;
      el.className = 'berth booked';
      el.onclick = null;
      hideLoading();
      showToast("Another passenger just booked this berth!");
    } else {
      hideLoading();
      showScreen('step-3');
    }
  }, 1000);
}

// ─── STEP 3: PASSENGER ───────────────────────────────────────────────────────
document.getElementById('btn-add-pax').addEventListener('click', () => {
  const age = parseInt(document.getElementById('p-age').value);
  if(age < 60 && age > 0) { alert("Senior citizen discount not applicable."); }
  if(age > 100 || age <= 0 || isNaN(age)) { alert("Please enter valid age."); return; }
  
  showLoading("ADDING PASSENGER...");
  // Fake freeze
  setTimeout(() => {
    hideLoading();
    showScreen('step-3-5'); // Captcha
  }, 3500);
});

// ─── STEP 3.5: CAPTCHA ───────────────────────────────────────────────────────
document.getElementById('btn-verify-captcha').addEventListener('click', () => {
  showLoading("VERIFYING...");
  setTimeout(() => { hideLoading(); showScreen('step-4'); startOtpPhase(); }, 1500);
});

// ─── STEP 4: OTP ─────────────────────────────────────────────────────────────
let hbInterval;
function startOtpPhase() {
  hbInterval = setInterval(playHeartbeat, 850);
  let timeLeft = 30;
  const timerEl = document.getElementById('otp-countdown');
  const tInt = setInterval(()=>{
    timeLeft--; timerEl.textContent = `OTP expires in: ${timeLeft}s`;
    if(timeLeft<=0) { clearInterval(tInt); timerEl.textContent = "OTP EXPIRED!"; }
  }, 1000);
}

document.querySelectorAll('.otp-box').forEach((box, i, arr) => {
  box.addEventListener('input', () => { if(box.value && i<3) arr[i+1].focus(); });
});

document.getElementById('btn-verify-otp').addEventListener('click', () => {
  const msg = document.getElementById('otp-msg');
  if(otpAttempts === 0) { msg.textContent = "OTP INCORRECT. Attempts remaining: 2."; otpAttempts++; }
  else if(otpAttempts === 1) { msg.textContent = "OTP INCORRECT. Attempts remaining: 1."; otpAttempts++; clearInterval(hbInterval); hbInterval=setInterval(playHeartbeat,400); }
  else {
    clearInterval(hbInterval);
    msg.textContent = "OTP VERIFIED ✓"; msg.style.color = "#16a34a";
    setTimeout(() => { showScreen('step-5'); }, 1000);
  }
});

// ─── STEP 5: PAYMENT ─────────────────────────────────────────────────────────
document.querySelectorAll('input[name="pay"]').forEach(r => {
  r.addEventListener('change', (e) => {
    document.getElementById('upi-box').style.display = e.target.value==='upi'?'block':'none';
    document.getElementById('net-box').style.display = e.target.value==='net'?'block':'none';
  });
});

document.getElementById('btn-retry-loading').addEventListener('click', () => {
  hideLoading();
});

document.getElementById('btn-pay').addEventListener('click', () => {
  showLoading("INITIATING PAYMENT...");
  setTimeout(() => {
    if(payFails === 0) {
      showErrorLoading("PAYMENT GATEWAY TIMEOUT. Please try again.");
      playTrombone(); payFails++;
    } 
    else if(payFails === 1) {
      showErrorLoading("PAYMENT FAILED — Your bank declined. Try another method.");
      playTrombone(); payFails++;
    }
    else {
      document.getElementById('loading-text').textContent = "REDIRECTING TO BANK...";
      setTimeout(() => { hideLoading(); showFinal(); }, 2000);
    }
  }, 3500);
});

// ─── STEP 7: FINALE (MEME) ───────────────────────────────────────────────────
function showFinal() {
  clearInterval(globalTimerInterval);
  endTime = Date.now();
  const timeTaken = Math.floor((endTime - startTime)/1000);
  
  // Fake confirmation then crash
  showScreen('step-0'); // hide everything
  const temp = document.createElement('div');
  temp.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;display:flex;align-items:center;justify-content:center;color:#16a34a;font-size:3rem;font-weight:700;font-family:Roboto Condensed;';
  temp.textContent = 'BOOKING CONFIRMED';
  document.body.appendChild(temp);
  
  setTimeout(() => {
    playCrash();
    temp.remove();
    showScreen('step-7');
    
    document.getElementById('end-time').textContent = `${Math.floor(timeTaken/60)}m ${timeTaken%60}s`;
    document.getElementById('end-otp').textContent = otpAttempts+1;
    document.getElementById('end-fails').textContent = payFails;
    
    let score = 100 - (timeTaken*0.5) - (payFails*10) - (berthsMissed*5);
    document.getElementById('end-score').textContent = `${Math.max(0, Math.floor(score))}/100`;
    
    drawMemeCanvas();
  }, 600);
}

function drawMemeCanvas() {
  const cvs = document.getElementById('meme-canvas');
  const ctx = cvs.getContext('2d');
  
  // BG
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0,0,600,300);
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
  for(let i=0;i<300;i+=20){ ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(600,i);ctx.stroke(); }
  
  // Header
  ctx.fillStyle = '#1a56db'; ctx.fillRect(0,0,600,60);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Roboto Condensed"'; ctx.fillText('IRCTC E-TICKETING SERVICE', 20, 38);
  
  // Details
  ctx.fillStyle = '#1f2937'; ctx.font = '20px Nunito';
  ctx.fillText('Train: 09001 TATKAL SPL', 20, 100);
  ctx.fillText('Class: 3A | Quota: TATKAL', 20, 130);
  ctx.fillText('Passenger: '+(document.getElementById('p-name').value||'DESPERATE SOUL'), 20, 160);
  
  // Status
  ctx.fillStyle = '#fef2f2'; ctx.fillRect(20, 200, 560, 80);
  ctx.strokeStyle = '#dc2626'; ctx.lineWidth=3; ctx.strokeRect(20, 200, 560, 80);
  
  ctx.fillStyle = '#dc2626'; ctx.font = 'bold 40px "Roboto Condensed"';
  ctx.fillText('STATUS: WAITING LIST 67', 40, 255);
  
  // Stamp
  ctx.save();
  ctx.translate(450, 140); ctx.rotate(-0.2);
  ctx.fillStyle = 'rgba(220,38,38,0.2)'; ctx.font = 'bold 30px "Roboto Condensed"';
  ctx.fillText('BETTER LUCK', 0, 0); ctx.fillText('NEXT TIME', 0, 30);
  ctx.restore();
}
