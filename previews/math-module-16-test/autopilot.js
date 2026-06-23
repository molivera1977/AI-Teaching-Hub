/* ═══════════════════════════════════════════════════════
   AUTOPILOT — Preview / demo driver (PREVIEW VERSION ONLY)
   Math Module 16 — plays the WHOLE test (all 25 questions),
   sped up, then the written part, then the results page.
   • Mr. O / 1234 login · realistic (misses a few) · confetti.
   • All network submissions blocked — live Google Sheet untouched.
   • Original site never modified; this file only in the copy.
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const T = {
    welcome: 2500, readAloud: 3000, directions: 6200,
    nameSelect: 1400, pinType: 1700, sectionStart: 1700,
    qRead: 1500, qSelect: 850, qFeedback: 1400, qSoak: 1200,
    writtenRead: 5200, writtenSubmit: 3000, endLinger: 1600
  };

  const $ = id => document.getElementById(id);

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
    b.innerHTML = '👀 <strong>PREVIEW</strong> — auto-playing the full test (sped up). '
      + '<span id="demo-pause" style="display:inline-block;background:rgba(255,255,255,.22);border-radius:6px;padding:2px 10px;cursor:pointer;margin-left:8px;font-weight:700;">⏸ Pause</span>'
      + '<span id="demo-replay" style="text-decoration:underline;cursor:pointer;margin-left:10px;">↻ Replay</span>';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#6c5ce7,#e056a0);color:#fff;text-align:center;font:600 13px/1.3 system-ui,sans-serif;padding:9px 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);';
    document.body.appendChild(b);
    const c = document.querySelector('.container'); if (c) c.style.marginTop = '40px';
    $('demo-pause').onclick = () => setPaused(!_paused);
    $('demo-replay').onclick = () => { try { localStorage.clear(); } catch (e) {} location.reload(); };
  }

  /* mostly correct, ~18% miss — answer is a STRING value */
  function chooseAnswer(q) {
    if (Math.random() < 0.18) {
      const wrong = q.choices.filter(c => c !== q.answer);
      if (wrong.length) return wrong[Math.floor(Math.random() * wrong.length)];
    }
    return q.answer;
  }

  /* fast read-lock → auto-answer */
  function patchReadLock() {
    app._startReadLock = function () {
      const bar = $('reading-timer-bar');
      bar.classList.remove('hidden');
      $('reading-count').textContent = '…';
      document.querySelectorAll('.answer-btn').forEach(b => { b.classList.add('locked-choice'); b.disabled = true; });
      setTimeout(() => { this._clearReadTimer(); answerCurrent(); }, T.qRead);
    };
  }

  /* fast soak → auto-advance */
  function patchSoak() {
    app._startSoakTimer = function () {
      const next = $('next-btn');
      next.classList.remove('hidden'); next.disabled = false;
      setTimeout(() => app.nextQuestion(), T.qSoak);
    };
  }

  async function answerCurrent() {
    const q = app.currentTest[app.currentIndex];
    if (!q) return;
    const pick = chooseAnswer(q);
    await wait(T.qSelect);
    const btn = [...document.querySelectorAll('.answer-btn')].find(b => b.dataset.answer === pick);
    if (btn) app.selectAnswer(pick, btn);
    await wait(T.qFeedback - 400);
    app.submitAnswer();   // shows ✅/❌, then patched soak advances
  }

  /* drive the written part after the MC test ends */
  const WRITTEN = {
    W1: "Marcus is not correct. When you multiply a fraction by a whole number, you only multiply the whole number by the top number and keep the bottom number the same. So 5 times 2/3 is 10/3, not 10/15. He made a mistake by also multiplying the denominator.",
    W2: "Aisha is correct and the answer is 10. Jordan made a mistake because he forgot to multiply the whole number 4 by the fraction part. He kept the 1/2 instead of doing 4 times 1/2 which is 2, so the real answer is 8 plus 2 equals 10."
  };

  function patchEndMC() {
    const orig = app._endMCTest.bind(app);
    app._endMCTest = function () {
      orig();             // builds the written screen
      driveWritten();
    };
  }

  async function driveWritten() {
    await wait(900);
    for (const id of ['W1', 'W2']) {
      const ta = $('textarea-' + id);
      if (ta) {
        ta.scrollIntoView({ behavior: 'smooth', block: 'center' });   // scroll prompt into view
        await wait(700);
        ta.value = WRITTEN[id]; app._updateWordCount(id, ta); ta.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(T.writtenRead);                                     // linger so viewers can read
      }
    }
    await wait(600);
    const submit = $('submit-written-btn');
    if (submit) { submit.scrollIntoView({ behavior: 'smooth', block: 'center' }); await wait(700); }
    app.submitWrittenResponses();
    await wait(T.writtenSubmit);
    const panel = $('written-success-panel');
    if (panel && !panel.classList.contains('hidden')) {
      const btn = panel.querySelector('button');
      if (btn) btn.click();        // → showEndScreen (results + confetti)
    }
    // unlock the end-screen "return" lock so it doesn't sit disabled
    setTimeout(() => {
      const lock = $('end-lock-bar'); if (lock) lock.classList.add('hidden');
      const rb = $('return-btn'); if (rb) rb.disabled = false;
    }, 1500);
  }

  async function run() {
    try {
      localStorage.removeItem('mathModule16Test_v1');
      localStorage.removeItem('mathModule16Test_completed_v1');
    } catch (e) {}
    await wait(T.welcome);   app.showReadAloudIntro();
    await wait(T.readAloud); app.showDirections();
    await wait(T.directions); app.showLogin();
    await wait(600);
    $('name-select').value = 'Mr. O (Teacher)';
    app.onNameSelect();
    await wait(T.nameSelect);
    const pin = $('student-pin'); pin.value = '';
    for (const ch of '1234') { pin.value += ch; await wait(120); }
    await wait(T.pinType);
    app.attemptLogin();   // → startTest() runs automatically; questions auto-chain
  }

  function boot() {
    if (typeof app === 'undefined') { setTimeout(boot, 50); return; }
    blockNetwork();
    addBanner();
    patchReadLock();
    patchSoak();
    patchEndMC();
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
