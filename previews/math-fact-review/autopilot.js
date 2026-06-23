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
    await wait(T.welcome);
    initSelection('multiplication');     // → selection screen
    await wait(T.modePause);
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
