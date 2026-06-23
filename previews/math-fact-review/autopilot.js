/* ═══════════════════════════════════════════════════════
   AUTOPILOT — Preview / demo driver (PREVIEW VERSION ONLY)
   Mr. O's Math Fact Review — a fast typed-answer fluency game.
   Plays 10 multiplication facts + 10 division facts (score
   accumulates across both), missing a few like a real student,
   then shows the final score.
   • No login, no student data, no network in this app — nothing
     to strip or block (a safety fetch-block is added anyway).
   • Original site never modified; this file only in the copy.
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const T = {
    welcome: 2200, modePause: 1600, levelPause: 1700,
    type: 350, afterCorrect: 1500, afterWrong: 1050,
    switchPause: 1800, finale: 1700
  };
  /* ---- pause / resume control ---- */
  let _paused = false;
  const _waiters = [];
  function _gate() { return _paused ? new Promise(res => _waiters.push(res)) : Promise.resolve(); }
  function setPaused(p) {
    _paused = p;
    const btn = document.getElementById('demo-pause');
    if (btn) btn.textContent = p ? '▶ Resume' : '⏸ Pause';
    if (!p) _waiters.splice(0).forEach(fn => fn());
  }
  const wait = ms => _gate().then(() => new Promise(r => setTimeout(r, ms))).then(_gate);

  function blockNetwork() {
    const of = window.fetch ? window.fetch.bind(window) : null;
    window.fetch = function (url) {
      const u = typeof url === 'string' ? url : (url && url.url) || '';
      if (u.indexOf('script.google.com') !== -1 || u.indexOf('macros/s/') !== -1)
        return Promise.resolve(new Response('', { status: 200 }));
      return of ? of.apply(window, arguments) : Promise.resolve(new Response('', { status: 200 }));
    };
    if (navigator.sendBeacon) navigator.sendBeacon = () => true;
  }

  function addBanner() {
    const b = document.createElement('div');
    b.id = 'demo-banner';
    b.innerHTML = '👀 <strong>PREVIEW</strong> — auto-playing 10 ×  and 10 ÷ facts. '
      + '<span id="demo-pause" style="display:inline-block;background:rgba(255,255,255,.22);border-radius:6px;padding:2px 10px;cursor:pointer;margin-left:8px;font-weight:700;">⏸ Pause</span>'
      + '<span id="demo-replay" style="text-decoration:underline;cursor:pointer;margin-left:10px;">↻ Replay</span>';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#6c5ce7,#e056a0);color:#fff;text-align:center;font:600 13px/1.3 system-ui,sans-serif;padding:9px 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);';
    document.body.appendChild(b);
    document.body.style.paddingTop = '38px';
    document.getElementById('demo-pause').onclick = () => setPaused(!_paused);
    document.getElementById('demo-replay').onclick = () => { try { localStorage.clear(); } catch (e) {} location.reload(); };
  }

  /* ---- animated demo cursor (so viewers see the menu choices) ---- */
  let cursorEl, cursorInner;
  function makeCursor() {
    cursorEl = document.createElement('div');
    cursorEl.id = 'demo-cursor';
    cursorEl.style.cssText = 'position:fixed;left:0;top:0;z-index:99998;pointer-events:none;'
      + 'transition:transform .9s cubic-bezier(.45,.05,.25,1),opacity .4s;will-change:transform;'
      + 'transform:translate(' + Math.round(window.innerWidth / 2) + 'px,' + Math.round(window.innerHeight * 0.62) + 'px);';
    cursorInner = document.createElement('div');
    cursorInner.style.cssText = 'transition:transform .12s;filter:drop-shadow(1px 2px 2px rgba(0,0,0,.45));';
    cursorInner.innerHTML = '<svg width="26" height="30" viewBox="0 0 16 20">'
      + '<path d="M1,1 L1,16 L5,12 L8,18.5 L10.2,17.4 L7.2,11.2 L13,11 Z" fill="#fff" stroke="#222" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    cursorEl.appendChild(cursorInner);
    document.body.appendChild(cursorEl);
  }
  function cursorTo(x, y, dur) {
    if (!cursorEl) return wait(0);
    cursorEl.style.transitionDuration = (dur / 1000) + 's,.4s';
    cursorEl.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    return wait(dur);
  }
  function cursorToEl(el, dur) {
    const r = el.getBoundingClientRect();
    return cursorTo(r.left + r.width * 0.5, r.top + r.height * 0.45, dur || 900);
  }
  function glow(el, on) {
    el.style.transition = 'box-shadow .2s,transform .2s';
    el.style.boxShadow = on ? '0 0 0 3px #fff,0 0 16px 4px rgba(108,92,231,.75)' : '';
    el.style.transform = on ? 'scale(1.05)' : '';
    if (on) el.style.position = el.style.position || 'relative';
  }
  function clickPulse(el) {
    if (cursorInner) { cursorInner.style.transform = 'scale(.75)'; setTimeout(() => { cursorInner.style.transform = ''; }, 150); }
    const r = el.getBoundingClientRect();
    const rip = document.createElement('div');
    rip.style.cssText = 'position:fixed;left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height / 2)
      + 'px;width:14px;height:14px;border-radius:50%;background:rgba(108,92,231,.45);'
      + 'transform:translate(-50%,-50%) scale(1);z-index:99997;pointer-events:none;transition:transform .55s ease-out,opacity .55s ease-out;';
    document.body.appendChild(rip);
    requestAnimationFrame(() => { rip.style.transform = 'translate(-50%,-50%) scale(7)'; rip.style.opacity = '0'; });
    setTimeout(() => rip.remove(), 600);
  }
  function hideCursor() { if (cursorEl) cursorEl.style.opacity = '0'; }

  /* answer one fact — ~20% of the time miss once, then correct */
  async function answerOne() {
    const correct = state.answer;
    if (Math.random() < 0.20) {
      const off = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
      ui.input.value = String(Math.max(0, correct + off));
      state.processing = false;      // ensure the wrong attempt registers
      checkAnswer();                 // wrong → "Try again!"
      await wait(T.afterWrong);
    }
    ui.input.value = String(correct);
    state.processing = false;        // ensure the correct attempt registers & advances
    checkAnswer();                   // correct → generateQuestion() fires (~0.8s)
    await wait(T.afterCorrect);
  }

  async function run() {
    makeCursor();
    await wait(T.welcome);               // welcome screen (Multiplication / Division)

    // 1) pick the Multiplication mode so viewers see the two entry choices
    const multCard = document.querySelector('.mode-card.mult');
    if (multCard) {
      await cursorToEl(multCard, 1100);
      glow(multCard, true); await wait(650);
      clickPulse(multCard); glow(multCard, false); await wait(250);
    }
    initSelection('multiplication');     // → level-selection screen
    await wait(T.modePause);

    // 2) drift slowly across the level choices so the menu is clear
    const tour = [
      document.querySelector('#mixed-grid .mixed-btn'),          // "Mixed 2-4"
      document.querySelectorAll('#number-grid .num-btn')[2],     // an individual number
      document.querySelectorAll('#number-grid .num-btn')[6]      // another number
    ].filter(Boolean);
    for (const el of tour) {
      await cursorToEl(el, 850);
      glow(el, true); await wait(600); glow(el, false);
    }

    // 3) land on "Mixed All (2-12)" and click it
    const allBtn = document.querySelector('.mixed-btn.mixed-all') || document.querySelector('#mixed-grid .mixed-btn');
    if (allBtn) {
      await cursorToEl(allBtn, 950);
      glow(allBtn, true); await wait(650);
      clickPulse(allBtn); glow(allBtn, false); await wait(250);
    }
    hideCursor();                        // answering is auto-typed; tuck the cursor away
    startPractice(2, 12);                // Mixed All multiplication; score reset to 0
    await wait(T.levelPause);

    for (let i = 0; i < 10; i++) await answerOne();

    // switch to division mid-session so the score keeps accumulating
    state.mode = 'division';
    if (ui.practiceTitle) ui.practiceTitle.innerText = 'Multiplication & Division';
    generateQuestion();
    await wait(T.switchPause);

    for (let i = 0; i < 10; i++) await answerOne();

    await wait(T.finale);
    endSession();                        // shows "Final Score: X Correct, Y Wrong"
  }

  function boot() {
    if (typeof state === 'undefined' || typeof startPractice !== 'function') { setTimeout(boot, 60); return; }
    blockNetwork();
    addBanner();
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
