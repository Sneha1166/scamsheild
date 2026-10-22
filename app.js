/**
 * ScamShield — app.js
 * Frontend logic: API calls, demo data, charts, tables, quiz
 * NOTE: All scan results are DEMO / rule-based only.
 */

'use strict';

/* ════════════════════════════════════════════════════════
   CONSTANTS & STATE
   ════════════════════════════════════════════════════════ */
const API_BASE = 'http://localhost:8080';

const STATE = {
  totalScans:  0,
  safeURLs:    0,
  suspicious:  0,
  scams:       0,
  records:     [],
  filtered:    [],
  page:        1,
  perPage:     10,
  sortCol:     5,
  sortAsc:     false
};

/* ════════════════════════════════════════════════════════
   NAVBAR ACTIVE LINK
   ════════════════════════════════════════════════════════ */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

/* ════════════════════════════════════════════════════════
   HERO PARTICLES
   ════════════════════════════════════════════════════════ */
function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left     = Math.random() * 100 + '%';
    p.style.bottom   = '-10px';
    p.style.width    = (Math.random() * 3 + 1) + 'px';
    p.style.height   = p.style.width;
    p.style.opacity  = String(Math.random() * 0.8);
    p.style.animationDuration  = (Math.random() * 6 + 4) + 's';
    p.style.animationDelay     = (Math.random() * 8) + 's';
    p.style.background = Math.random() > 0.5 ? '#00e5ff' : '#a855f7';
    container.appendChild(p);
  }
}
spawnParticles();

/* ════════════════════════════════════════════════════════
   COUNTER ANIMATION
   ════════════════════════════════════════════════════════ */
function animateCounter(el, target, duration = 900) {
  const start = parseInt(el.textContent) || 0;
  const range = target - start;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + range * ease);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateDashboard() {
  animateCounter(document.getElementById('stat-total'),      STATE.totalScans);
  animateCounter(document.getElementById('stat-safe'),       STATE.safeURLs);
  animateCounter(document.getElementById('stat-suspicious'), STATE.suspicious);
  animateCounter(document.getElementById('stat-scams'),      STATE.scams);

  const max = Math.max(STATE.totalScans, 1);
  setTimeout(() => {
    document.getElementById('bar-total').style.width      = '100%';
    document.getElementById('bar-safe').style.width       = (STATE.safeURLs    / max * 100) + '%';
    document.getElementById('bar-suspicious').style.width = (STATE.suspicious  / max * 100) + '%';
    document.getElementById('bar-scams').style.width      = (STATE.scams       / max * 100) + '%';
  }, 200);
}

/* ════════════════════════════════════════════════════════
   ACTIVITY BAR CHART (Canvas)
   ════════════════════════════════════════════════════════ */
function drawActivityChart(data) {
  const canvas = document.getElementById('activityChart');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const dpr    = window.devicePixelRatio || 1;
  const W      = canvas.offsetWidth  || 800;
  const H      = 240;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const labels  = data.labels;
  const series  = data.series; // [{name, values, color}]
  const barGroups = labels.length;
  const barsPerGroup = series.length;
  const padLeft = 40, padRight = 20, padTop = 20, padBottom = 40;
  const chartW  = W - padLeft - padRight;
  const chartH  = H - padTop - padBottom;
  const maxVal  = Math.max(...series.flatMap(s => s.values), 1);
  const groupW  = chartW / barGroups;
  const barW    = (groupW * 0.65) / barsPerGroup;
  const barGap  = 3;

  /* Grid lines */
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padTop + chartH - (i / 5) * chartH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + chartW, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = `${10 * dpr / dpr}px Segoe UI`;
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * i / 5), padLeft - 6, y + 4);
  }

  /* Bars with animation */
  let animProgress = 0;
  function renderFrame(progress) {
    ctx.clearRect(0, 0, W, H);

    /* Grid lines (re-draw) */
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padTop + chartH - (i / 5) * chartH;
      ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(padLeft + chartW, y); ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.5)';
      ctx.font = '10px Segoe UI'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * i / 5), padLeft - 6, y + 4);
    }

    series.forEach((serie, si) => {
      serie.values.forEach((val, gi) => {
        const barH  = (val / maxVal) * chartH * progress;
        const x     = padLeft + gi * groupW + (groupW * 0.175) + si * (barW + barGap);
        const y     = padTop + chartH - barH;

        /* Gradient bar */
        const grad = ctx.createLinearGradient(0, y, 0, padTop + chartH);
        grad.addColorStop(0, serie.color);
        grad.addColorStop(1, serie.color + '33');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [3,3,0,0]) : ctx.rect(x, y, barW, barH);
        ctx.fill();
      });
    });

    /* X-axis labels */
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.font = '11px Segoe UI';
    ctx.textAlign = 'center';
    labels.forEach((lbl, gi) => {
      const x = padLeft + gi * groupW + groupW / 2;
      ctx.fillText(lbl, x, padTop + chartH + 18);
    });

    /* Legend */
    let lx = padLeft;
    series.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, padTop + chartH + 28, 10, 10);
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.font = '11px Segoe UI'; ctx.textAlign = 'left';
      ctx.fillText(s.name, lx + 14, padTop + chartH + 38);
      lx += ctx.measureText(s.name).width + 34;
    });
  }

  /* Animate bars growing */
  const startTime = performance.now();
  const dur = 900;
  function animate(now) {
    animProgress = Math.min((now - startTime) / dur, 1);
    const ease = 1 - Math.pow(1 - animProgress, 3);
    renderFrame(ease);
    if (animProgress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

/* Seed chart data from records */
function buildChartData() {
  const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const safe  = days.map(() => Math.floor(Math.random() * 12 + 3));
  const susp  = days.map(() => Math.floor(Math.random() * 6 + 1));
  const scams = days.map(() => Math.floor(Math.random() * 4));
  drawActivityChart({
    labels: days,
    series: [
      { name: 'Safe',       values: safe,  color: '#22c55e' },
      { name: 'Suspicious', values: susp,  color: '#f59e0b' },
      { name: 'Scams',      values: scams, color: '#ef4444' }
    ]
  });
}

window.addEventListener('resize', () => buildChartData());

/* ════════════════════════════════════════════════════════
   RESULT BOX HELPERS
   ════════════════════════════════════════════════════════ */
function verdictClass(v) {
  const m = { SAFE:'safe', SUSPICIOUS:'suspicious', DANGEROUS:'dangerous',
              SCAM:'scam', CLEAN:'safe', 'FAKE JOB':'fake-job', LEGITIMATE:'safe' };
  return m[v] || 'suspicious';
}
function verdictPillClass(v) {
  const m = { SAFE:'pill-safe', SUSPICIOUS:'pill-suspicious', DANGEROUS:'pill-dangerous',
              SCAM:'pill-scam', CLEAN:'pill-clean', 'FAKE JOB':'pill-fake-job', LEGITIMATE:'pill-legitimate' };
  return m[v] || 'pill-suspicious';
}
function scoreColor(s) {
  if (s < 30) return '#22c55e';
  if (s < 60) return '#f59e0b';
  return '#ef4444';
}

function renderResultBox(containerId, verdict, score, reason) {
  const box = document.getElementById(containerId);
  box.className = 'result-box ' + verdictClass(verdict);
  box.innerHTML = `
    <div class="result-verdict verdict-${verdictClass(verdict)}">${verdict}</div>
    <div class="result-score-bar">
      <div class="result-score-fill" style="width:0%;background:${scoreColor(score)}"></div>
    </div>
    <div class="result-reason">${escapeHTML(reason)}</div>
    <div class="result-demo-warn">⚠️ DEMO RESULT — Rule-based detection only. Does not guarantee actual safety.</div>`;
  box.classList.remove('hidden');
  setTimeout(() => {
    const fill = box.querySelector('.result-score-fill');
    if (fill) fill.style.width = score + '%';
  }, 80);
}

function setButtonLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>Scanning…';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.orig || btn.innerHTML;
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ════════════════════════════════════════════════════════
   1. PHISHING URL CHECKER
   ════════════════════════════════════════════════════════ */
window.checkURL = async function() {
  const input = document.getElementById('url-input');
  const url   = input.value.trim();
  if (!url) { alert('Please enter a URL.'); return; }

  const btn = input.nextElementSibling;
  setButtonLoading(btn, true);

  try {
    const res  = await fetch(`${API_BASE}/api/check-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    renderResultBox('url-result', data.verdict, data.score, data.reason);
    recordScan(url, 'URL', data.verdict, data.score);
  } catch (err) {
    /* Fallback: client-side demo if server offline */
    const result = clientCheckURL(url);
    renderResultBox('url-result', result.verdict, result.score, result.reason + ' [offline demo]');
    recordScan(url, 'URL', result.verdict, result.score);
  }
  setButtonLoading(btn, false);
};

/* ════════════════════════════════════════════════════════
   2. WEBSITE SECURITY SCANNER (simulated)
   ════════════════════════════════════════════════════════ */
window.scanWebsite = function() {
  const input = document.getElementById('web-input');
  const url   = input.value.trim();
  if (!url) { alert('Please enter a URL.'); return; }

  const btn = input.nextElementSibling;
  setButtonLoading(btn, true);

  setTimeout(() => {
    const checks = simulateSecurityScan(url);
    const passCount = checks.filter(c => c.pass).length;
    const score = Math.round((passCount / checks.length) * 100);
    const verdict = score >= 80 ? 'SAFE' : score >= 50 ? 'SUSPICIOUS' : 'DANGEROUS';
    const reason  = `${passCount}/${checks.length} security checks passed.`;

    const box = document.getElementById('web-result');
    box.className = 'result-box ' + verdictClass(verdict);
    let listHTML = checks.map(c =>
      `<li><span class="check-icon">${c.pass ? '✅' : '❌'}</span><span>${escapeHTML(c.name)}: <strong>${c.status}</strong> — ${escapeHTML(c.detail)}</span></li>`
    ).join('');
    box.innerHTML = `
      <div class="result-verdict verdict-${verdictClass(verdict)}">${verdict} — Security Score: ${score}%</div>
      <div class="result-score-bar">
        <div class="result-score-fill" style="width:0%;background:${scoreColor(100 - score)}"></div>
      </div>
      <ul class="check-list">${listHTML}</ul>
      <div class="result-demo-warn">⚠️ DEMO: Simulated header checks. Only scan websites you are authorized to test.</div>`;
    box.classList.remove('hidden');
    setTimeout(() => {
      const fill = box.querySelector('.result-score-fill');
      if (fill) fill.style.width = (100 - score) + '%';
    }, 80);

    recordScan(url, 'Web Scan', verdict, 100 - score);
    setButtonLoading(btn, false);
  }, 1200);
};

function simulateSecurityScan(url) {
  const isHTTPS = url.startsWith('https://');
  const isTrusted = ['google.com','github.com','microsoft.com','ibm.com','cloudflare.com'].some(d => url.includes(d));
  const seed = url.length % 7;

  return [
    { name: 'HTTPS',          pass: isHTTPS,          status: isHTTPS ? 'Present'    : 'Missing',  detail: isHTTPS ? 'Encrypted connection.' : 'Plain HTTP — data is unencrypted.' },
    { name: 'HSTS Header',    pass: isTrusted||seed>2, status: (isTrusted||seed>2) ? 'Enabled'   : 'Missing',  detail: 'HTTP Strict Transport Security.' },
    { name: 'CSP Header',     pass: isTrusted||seed>4, status: (isTrusted||seed>4) ? 'Present'   : 'Missing',  detail: 'Content Security Policy header.' },
    { name: 'X-Frame-Options',pass: isTrusted||seed>1, status: (isTrusted||seed>1) ? 'Set'       : 'Missing',  detail: 'Protects against clickjacking.' },
    { name: 'CORS Policy',    pass: isTrusted||seed>3, status: (isTrusted||seed>3) ? 'Restricted': 'Permissive', detail: 'Cross-Origin Resource Sharing policy.' },
    { name: 'X-Content-Type', pass: isTrusted||seed>0, status: (isTrusted||seed>0) ? 'Set'       : 'Missing',  detail: 'Prevents MIME-type sniffing.' },
    { name: 'Valid TLD',      pass: !url.match(/\.(tk|ml|ga|cf|xyz)($|\/)/), status: 'Checked', detail: 'Top-level domain reputation check.' }
  ];
}

/* ════════════════════════════════════════════════════════
   3. SCAM MESSAGE DETECTOR
   ════════════════════════════════════════════════════════ */
window.checkMessage = async function() {
  const textarea = document.getElementById('msg-input');
  const message  = textarea.value.trim();
  if (!message) { alert('Please paste a message to analyze.'); return; }

  const btn = textarea.nextElementSibling;
  setButtonLoading(btn, true);

  try {
    const res  = await fetch(`${API_BASE}/api/check-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderResultBox('msg-result', data.verdict, data.score, data.reason);
    recordScan(message.substring(0,40)+'…', 'Message', data.verdict, data.score);
  } catch(err) {
    const r = clientCheckMessage(message);
    renderResultBox('msg-result', r.verdict, r.score, r.reason + ' [offline demo]');
    recordScan(message.substring(0,40)+'…', 'Message', r.verdict, r.score);
  }
  setButtonLoading(btn, false);
};

/* ════════════════════════════════════════════════════════
   4. FAKE JOB DETECTOR
   ════════════════════════════════════════════════════════ */
window.checkJob = async function() {
  const textarea = document.getElementById('job-input');
  const text     = textarea.value.trim();
  if (!text) { alert('Please paste a job advertisement to analyze.'); return; }

  const btn = textarea.nextElementSibling;
  setButtonLoading(btn, true);

  try {
    const res  = await fetch(`${API_BASE}/api/check-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderResultBox('job-result', data.verdict, data.score, data.reason);
    recordScan(text.substring(0,40)+'…', 'Job', data.verdict, data.score);
  } catch(err) {
    const r = clientCheckJob(text);
    renderResultBox('job-result', r.verdict, r.score, r.reason + ' [offline demo]');
    recordScan(text.substring(0,40)+'…', 'Job', r.verdict, r.score);
  }
  setButtonLoading(btn, false);
};

/* ════════════════════════════════════════════════════════
   6. SAFETY SCORE QUIZ
   ════════════════════════════════════════════════════════ */
window.calcSafetyScore = function() {
  const ids = ['q1','q2','q3','q4','q5','q6','q7','q8'];
  const score = ids.filter(id => document.getElementById(id).checked).length;
  const pct   = Math.round(score / ids.length * 100);
  const color = scoreColor(100 - pct);

  const tips = [];
  if (!document.getElementById('q1').checked) tips.push('Use a password manager to keep unique passwords per site.');
  if (!document.getElementById('q2').checked) tips.push('Enable 2FA on all important accounts immediately.');
  if (!document.getElementById('q3').checked) tips.push('Always hover over links to see the real destination URL.');
  if (!document.getElementById('q4').checked) tips.push('Enable automatic updates — most attacks exploit unpatched software.');
  if (!document.getElementById('q5').checked) tips.push('Use a VPN on public Wi-Fi for banking or sensitive logins.');
  if (!document.getElementById('q6').checked) tips.push('Banks and UPI apps NEVER ask for your OTP or PIN.');
  if (!document.getElementById('q7').checked) tips.push('Install a reputable antivirus and keep it updated.');
  if (!document.getElementById('q8').checked) tips.push('Review app permissions monthly; revoke what isn\'t needed.');

  const label = pct >= 87 ? 'Excellent 🏆' : pct >= 62 ? 'Good 👍' : pct >= 37 ? 'Fair ⚠️' : 'Needs Work 🚨';

  const tipsHTML = tips.length
    ? `<ul class="score-tips">${tips.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>`
    : '<p style="color:var(--green);margin-top:12px;">✅ Great job! Your cybersecurity hygiene is excellent.</p>';

  const disp = document.getElementById('score-result');
  disp.classList.remove('hidden');
  disp.innerHTML = `
    <div class="score-num" style="color:${color}">${pct}<span style="font-size:1.5rem">%</span></div>
    <div class="score-label">${label}</div>
    <div class="score-bar-wrap">
      <div class="score-bar-fill" style="width:0%;background:${color}"></div>
    </div>
    <div style="font-size:13px;color:var(--text-muted);">${score} / ${ids.length} good practices in place</div>
    ${tips.length ? '<div style="font-size:13px;color:var(--text-muted);margin-top:14px;font-weight:600;">Recommendations:</div>' : ''}
    ${tipsHTML}
    <div class="result-demo-warn" style="margin-top:14px;">⚠️ DEMO: Self-assessment only. Consult a security professional for a real audit.</div>`;
  setTimeout(() => {
    const fill = disp.querySelector('.score-bar-fill');
    if (fill) fill.style.width = pct + '%';
  }, 80);
};

/* ════════════════════════════════════════════════════════
   RECORDS TABLE
   ════════════════════════════════════════════════════════ */
function recordScan(target, type, verdict, score) {
  const now = new Date();
  STATE.records.unshift({
    id:      STATE.records.length + 1,
    target:  target.length > 55 ? target.substring(0, 52) + '…' : target,
    type,
    verdict,
    score,
    date:    now.toLocaleDateString('en-IN') + ' ' + now.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})
  });

  /* Update stats */
  STATE.totalScans++;
  if (verdict === 'SAFE' || verdict === 'CLEAN' || verdict === 'LEGITIMATE') STATE.safeURLs++;
  else if (verdict === 'SUSPICIOUS') STATE.suspicious++;
  else STATE.scams++;

  updateDashboard();
  refreshTable();
}

function formatDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-IN') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

/* 50 fictional demo records */
const DEMO_RECORDS = [
  { target:'http://secure-paypal-login.xyz/verify', type:'URL', verdict:'DANGEROUS', score:85 },
  { target:'https://google.com',                    type:'URL', verdict:'SAFE',      score:5  },
  { target:'http://192.168.1.1/admin',              type:'URL', verdict:'DANGEROUS', score:70 },
  { target:'https://github.com/security',           type:'URL', verdict:'SAFE',      score:5  },
  { target:'http://win-free-iphone.tk',             type:'URL', verdict:'DANGEROUS', score:95 },
  { target:'https://ibm.com',                       type:'URL', verdict:'SAFE',      score:5  },
  { target:'http://verify-account-now.pw',          type:'URL', verdict:'DANGEROUS', score:90 },
  { target:'https://microsoft.com',                 type:'URL', verdict:'SAFE',      score:5  },
  { target:'http://bank-signin.click/login',        type:'URL', verdict:'DANGEROUS', score:88 },
  { target:'https://stackoverflow.com',             type:'URL', verdict:'SAFE',      score:5  },
  { target:'http://prize-claim-reward.ml',          type:'URL', verdict:'DANGEROUS', score:92 },
  { target:'https://cloudflare.com',                type:'URL', verdict:'SAFE',      score:5  },
  { target:'http://update-credentials.cf',          type:'URL', verdict:'DANGEROUS', score:80 },
  { target:'https://amazon.com/s',                  type:'URL', verdict:'SAFE',      score:5  },
  { target:'http://paypal.secure.verify.gq',        type:'URL', verdict:'DANGEROUS', score:93 },
  { target:'https://mozilla.org',                   type:'URL', verdict:'SAFE',      score:5  },
  { target:'Congratulations! You WON ₹50,000. Click link to claim.',  type:'Message', verdict:'SCAM',       score:80 },
  { target:'Your bank account is SUSPENDED. Send OTP to verify.',     type:'Message', verdict:'SCAM',       score:90 },
  { target:'Meeting rescheduled to 3pm tomorrow.',                    type:'Message', verdict:'CLEAN',      score:5  },
  { target:'URGENT: Wire transfer ₹10,000 gift card immediately.',    type:'Message', verdict:'SCAM',       score:85 },
  { target:'Hi, your order has shipped. Track here.',                 type:'Message', verdict:'CLEAN',      score:8  },
  { target:'Claim your lottery reward — limited offer, act now!',     type:'Message', verdict:'SCAM',       score:95 },
  { target:'Please confirm your account details to avoid suspension.',type:'Message', verdict:'SUSPICIOUS',score:45 },
  { target:'Team meeting notes attached. Please review.',             type:'Message', verdict:'CLEAN',      score:3  },
  { target:'Your KYC is expired. Send OTP to reactivate UPI.',        type:'Message', verdict:'SCAM',       score:88 },
  { target:'Work From Home — earn $5000 daily, no experience needed!',type:'Job',    verdict:'FAKE JOB',   score:90 },
  { target:'Personal Assistant needed. Advance payment required.',    type:'Job',    verdict:'FAKE JOB',   score:82 },
  { target:'Software Engineer, 3 yrs exp, competitive salary.',       type:'Job',    verdict:'LEGITIMATE', score:8  },
  { target:'Money mule needed. Easy money, daily Western Union pay.', type:'Job',    verdict:'FAKE JOB',   score:95 },
  { target:'Be your own boss! Unlimited income, get rich fast!',      type:'Job',    verdict:'FAKE JOB',   score:88 },
  { target:'Data Analyst role at fintech startup, remote-friendly.',  type:'Job',    verdict:'LEGITIMATE', score:10 },
  { target:'100% guaranteed salary ₹80,000/month, no skills needed.', type:'Job',    verdict:'FAKE JOB',   score:92 },
  { target:'Content writer needed, part-time, flexible hours.',       type:'Job',    verdict:'LEGITIMATE', score:6  },
  { target:'http://login.yourbank.secure-verify.top',                 type:'URL',    verdict:'DANGEROUS',  score:87 },
  { target:'http://click-here-now.link/prize',                        type:'URL',    verdict:'DANGEROUS',  score:83 },
  { target:'https://wikipedia.org',                                   type:'URL',    verdict:'SAFE',       score:5  },
  { target:'http://download-free.zip',                                type:'URL',    verdict:'DANGEROUS',  score:78 },
  { target:'IT Support needed, on-site, entry level.',                type:'Job',    verdict:'LEGITIMATE', score:12 },
  { target:'Send ₹1 to collect ₹1000 cashback — limited time!',       type:'Message',verdict:'SCAM',       score:88 },
  { target:'Scan QR code to receive money in your account.',          type:'Message',verdict:'SCAM',       score:90 },
  { target:'Hi team, please review the attached proposal.',           type:'Message',verdict:'CLEAN',      score:4  },
  { target:'http://lucky-winner-2024.pw/claim',                       type:'URL',    verdict:'DANGEROUS',  score:91 },
  { target:'https://apple.com',                                       type:'URL',    verdict:'SAFE',       score:5  },
  { target:'Financial freedom! Work 2hrs/day, earn ₹1 lakh/month.',   type:'Job',    verdict:'FAKE JOB',   score:86 },
  { target:'UPI blocked — share screen with support to fix.',         type:'Message',verdict:'SCAM',       score:92 },
  { target:'DevOps Engineer, 5 yrs exp, hybrid, Bengaluru.',          type:'Job',    verdict:'LEGITIMATE', score:9  },
  { target:'http://confirm-your-paypal.review',                       type:'URL',    verdict:'DANGEROUS',  score:86 },
  { target:'You have been selected for ₹5 lakh government scheme!',   type:'Message',verdict:'SCAM',       score:94 },
  { target:'https://github.com',                                      type:'URL',    verdict:'SAFE',       score:5  },
  { target:'Processing fee required to release your job offer letter.',type:'Job',   verdict:'FAKE JOB',   score:80 }
];

window.generateSampleData = function() {
  STATE.records = [];
  STATE.totalScans = 0; STATE.safeURLs = 0; STATE.suspicious = 0; STATE.scams = 0;

  DEMO_RECORDS.forEach((r, i) => {
    const v = r.verdict;
    STATE.totalScans++;
    if (v === 'SAFE' || v === 'CLEAN' || v === 'LEGITIMATE') STATE.safeURLs++;
    else if (v === 'SUSPICIOUS') STATE.suspicious++;
    else STATE.scams++;

    STATE.records.push({
      id:      i + 1,
      target:  r.target.length > 55 ? r.target.substring(0,52)+'…' : r.target,
      type:    r.type,
      verdict: r.verdict,
      score:   r.score,
      date:    formatDate(Math.floor(i * 0.3))
    });
  });

  updateDashboard();
  buildChartData();
  refreshTable();
};

/* ── TABLE RENDER ── */
window.filterTable = function() {
  const q = document.getElementById('search-input').value.toLowerCase();
  STATE.filtered = STATE.records.filter(r =>
    r.target.toLowerCase().includes(q) ||
    r.type.toLowerCase().includes(q)   ||
    r.verdict.toLowerCase().includes(q)
  );
  STATE.page = 1;
  renderTable();
};

function refreshTable() {
  STATE.filtered = [...STATE.records];
  renderTable();
  document.getElementById('search-input').value = '';
}

function renderTable() {
  const tbody = document.getElementById('records-body');
  const total = STATE.filtered.length;
  const pages = Math.ceil(total / STATE.perPage);
  const start = (STATE.page - 1) * STATE.perPage;
  const slice = STATE.filtered.slice(start, start + STATE.perPage);

  tbody.innerHTML = slice.map(r => {
    const pc = verdictPillClass(r.verdict);
    const sc = scoreColor(r.score);
    return `<tr>
      <td style="color:var(--text-muted)">${r.id}</td>
      <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(r.target)}">${escapeHTML(r.target)}</td>
      <td>${escapeHTML(r.type)}</td>
      <td><span class="verdict-pill ${pc}">${escapeHTML(r.verdict)}</span></td>
      <td>
        <span style="font-size:12px;font-weight:600;color:${sc}">${r.score}</span>
        <span class="score-mini"><span class="score-mini-fill" style="width:${r.score}%;background:${sc}"></span></span>
      </td>
      <td style="white-space:nowrap">${escapeHTML(r.date)}</td>
    </tr>`;
  }).join('');

  document.getElementById('record-count').textContent =
    `${total} record${total !== 1 ? 's' : ''} (page ${STATE.page} of ${Math.max(pages,1)})`;

  /* Pagination */
  const pag = document.getElementById('pagination');
  let btns = '';
  for (let i = 1; i <= pages; i++) {
    btns += `<button class="page-btn${i === STATE.page ? ' active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  pag.innerHTML = btns;
}

window.goPage = function(n) { STATE.page = n; renderTable(); };

window.sortTable = function(col) {
  if (STATE.sortCol === col) STATE.sortAsc = !STATE.sortAsc;
  else { STATE.sortCol = col; STATE.sortAsc = true; }
  const keys = ['id','target','type','verdict','score','date'];
  const key  = keys[col];
  STATE.filtered.sort((a, b) => {
    const av = a[key], bv = b[key];
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return STATE.sortAsc ? cmp : -cmp;
  });
  renderTable();
};

/* ── CSV EXPORT ── */
window.exportCSV = function() {
  const rows = [['#','Target','Type','Verdict','Risk Score','Date']];
  STATE.filtered.forEach(r => rows.push([r.id, r.target, r.type, r.verdict, r.score, r.date]));
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'scamshield_records.csv'; a.click();
  URL.revokeObjectURL(url);
};

/* ════════════════════════════════════════════════════════
   CLIENT-SIDE FALLBACK DETECTION (when server is offline)
   ════════════════════════════════════════════════════════ */
const TRUSTED = ['google.com','github.com','microsoft.com','apple.com','amazon.com','ibm.com','cloudflare.com','mozilla.org','wikipedia.org'];
const PHISH_KW = ['login','verify','secure','update','confirm','account','banking','paypal','signin','password','free-iphone','winner','click-here','urgent','suspended','verify-now','prize'];
const SUSP_TLD = ['.xyz','.tk','.ml','.ga','.cf','.gq','.pw','.top','.click','.link','.download','.zip','.review'];
const SCAM_KW  = ['won a prize','click the link','verify your account','otp','bank account','urgent action','free gift','lottery','you have been selected','limited offer','send money','wire transfer','gift card','nigerian prince','inheritance','claim your reward','100% free','act immediately','suspended account','confirm your details'];
const JOB_KW   = ['work from home','no experience needed','earn $5000','daily payment','wire transfer','western union','money mule','personal assistant','processing fees','advance payment','100% guaranteed salary','unlimited income','be your own boss','easy money','get rich','financial freedom'];

function clientCheckURL(url) {
  const lower = url.toLowerCase();
  if (TRUSTED.some(d => lower.includes(d))) return { verdict:'SAFE', score:5, reason:'Recognized trusted domain.' };
  let score = 0, reasons = [];
  if (!url.startsWith('https://')) { score += 10; reasons.push('No HTTPS'); }
  PHISH_KW.forEach(k => { if (lower.includes(k)) { score += 15; reasons.push(k); } });
  SUSP_TLD.forEach(t => { if (lower.includes(t)) { score += 20; reasons.push('Suspicious TLD'); } });
  score = Math.min(score, 100);
  const verdict = score >= 60 ? 'DANGEROUS' : score >= 30 ? 'SUSPICIOUS' : 'SAFE';
  return { verdict, score, reason: reasons.length ? 'Flags: ' + reasons.slice(0,3).join(', ') : 'No major flags.' };
}

function clientCheckMessage(msg) {
  const lower = msg.toLowerCase();
  let score = 0, reasons = [];
  SCAM_KW.forEach(k => { if (lower.includes(k)) { score += 20; reasons.push(k); } });
  score = Math.min(score, 100);
  const verdict = score >= 60 ? 'SCAM' : score >= 25 ? 'SUSPICIOUS' : 'CLEAN';
  return { verdict, score, reason: reasons.length ? 'Patterns: ' + reasons.slice(0,3).join(', ') : 'No scam patterns.' };
}

function clientCheckJob(text) {
  const lower = text.toLowerCase();
  let score = 0, reasons = [];
  JOB_KW.forEach(k => { if (lower.includes(k)) { score += 18; reasons.push(k); } });
  score = Math.min(score, 100);
  const verdict = score >= 50 ? 'FAKE JOB' : score >= 25 ? 'SUSPICIOUS' : 'LEGITIMATE';
  return { verdict, score, reason: reasons.length ? 'Red flags: ' + reasons.slice(0,3).join(', ') : 'No fake-job indicators.' };
}

/* ════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════ */
(function init() {
  generateSampleData();
  buildChartData();

  /* Smooth scroll for nav links */
  document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const id = link.getAttribute('href').substring(1);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* IntersectionObserver to update active nav */
  const sections = document.querySelectorAll('.section');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.nav-link').forEach(l => {
          l.classList.toggle('active', l.dataset.section === entry.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => observer.observe(s));

  console.log('%c🛡️ ScamShield loaded — DEMO MODE', 'color:#00e5ff;font-size:14px;font-weight:bold');
  console.log('%cAll results are rule-based demonstrations only.', 'color:#f59e0b');
})();
