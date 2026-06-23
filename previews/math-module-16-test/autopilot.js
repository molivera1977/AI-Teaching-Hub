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

  /* ---- animated demo cursor (highlights select → submit → next) ---- */
  let cursorEl, cursorInner;
  let readAloudDemos = 0;   // show off the 🔊 read-aloud on the first 2 questions
  function makeCursor() {
    cursorEl = document.createElement('div');
    cursorEl.id = 'demo-cursor';
    cursorEl.style.cssText = 'position:fixed;left:0;top:0;z-index:99998;pointer-events:none;'
      + 'transition:transform .9s cubic-bezier(.45,.05,.25,1),opacity .4s;will-change:transform;'
      + 'transform:translate(' + Math.round(window.innerWidth / 2) + 'px,' + Math.round(window.innerHeight * 0.6) + 'px);';
    cursorInner = document.createElement('div');
    cursorInner.style.cssText = 'transition:transform .12s;filter:drop-shadow(1px 2px 2px rgba(0,0,0,.45));';
    cursorInner.innerHTML = '<svg width="26" height="30" viewBox="0 0 16 20">'
      + '<path d="M1,1 L1,16 L5,12 L8,18.5 L10.2,17.4 L7.2,11.2 L13,11 Z" fill="#fff" stroke="#222" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    cursorEl.appendChild(cursorInner);
    document.body.appendChild(cursorEl);
  }
  function cursorTo(x, y, dur) {
    if (!cursorEl) return wait(0);
    cursorEl.style.opacity = '1';
    cursorEl.style.transitionDuration = (dur / 1000) + 's,.4s';
    cursorEl.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    return wait(dur);
  }
  function cursorToEl(el, dur) {
    if (!el) return wait(0);
    const r = el.getBoundingClientRect();
    return cursorTo(r.left + r.width * 0.5, r.top + r.height * 0.5, dur || 850);
  }
  function glow(el, on) {
    if (!el) return;
    el.style.transition = 'box-shadow .2s,transform .2s';
    el.style.boxShadow = on ? '0 0 0 3px #fff,0 0 16px 4px rgba(108,92,231,.75)' : '';
    el.style.transform = on ? 'scale(1.04)' : '';
  }
  function clickPulse(el) {
    if (cursorInner) { cursorInner.style.transform = 'scale(.75)'; setTimeout(() => { cursorInner.style.transform = ''; }, 150); }
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rip = document.createElement('div');
    rip.style.cssText = 'position:fixed;left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height / 2)
      + 'px;width:14px;height:14px;border-radius:50%;background:rgba(108,92,231,.45);'
      + 'transform:translate(-50%,-50%) scale(1);z-index:99997;pointer-events:none;transition:transform .55s ease-out,opacity .55s ease-out;';
    document.body.appendChild(rip);
    requestAnimationFrame(() => { rip.style.transform = 'translate(-50%,-50%) scale(7)'; rip.style.opacity = '0'; });
    setTimeout(() => rip.remove(), 600);
  }
  async function cursorClick(el, dur, hold) {
    if (!el) return;
    await cursorToEl(el, dur || 800);
    glow(el, true);
    await wait(hold || 320);
    clickPulse(el);
    glow(el, false);
    if (typeof el.click === 'function') el.click();
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

  /* soak just reveals the Next button — the cursor clicks it in answerCurrent */
  function patchSoak() {
    app._startSoakTimer = function () {
      const next = $('next-btn');
      if (next) { next.classList.remove('hidden'); next.disabled = false; }
    };
  }

  /* Tap the question's 🔊 button: clicking it (speakQuestion) wraps the
     words in .wrd spans and attempts audio; we then manually walk-highlight
     each word so the highlighting shows even when autoplay audio is blocked. */
  async function demoReadAloud() {
    const sb = $('speak-q-btn');
    const qtEl = $('question-text');
    if (!sb || !qtEl) return;
    await cursorToEl(sb, 800);
    glow(sb, true); await wait(250); clickPulse(sb); glow(sb, false);
    try { sb.click(); } catch (e) {}          // speakQuestion: wraps words, ⏹, best-effort audio
    await wait(180);
    const words = Array.from(qtEl.querySelectorAll('.wrd'));
    for (let i = 0; i < words.length; i++) {
      words.forEach(w => w.classList.remove('hl'));
      words[i].classList.add('hl');
      await wait(200);
    }
    words.forEach(w => w.classList.remove('hl'));
    try { window.speechSynthesis.cancel(); } catch (e) {}
    sb.textContent = '🔊';
    await wait(450);
  }

  async function answerCurrent() {
    const q = app.currentTest[app.currentIndex];
    if (!q) return;

    // 0) READ-ALOUD demo on the first two questions
    if (readAloudDemos < 2) {
      readAloudDemos++;
      await demoReadAloud();
    }

    const pick = chooseAnswer(q);
    const btn = [...document.querySelectorAll('.answer-btn')].find(b => b.dataset.answer === pick);

    // 1) SELECT — move to the chosen answer, highlight, click
    await cursorToEl(btn, 850);
    glow(btn, true);
    await wait(300);
    clickPulse(btn);
    if (btn) app.selectAnswer(pick, btn);
    await wait(T.qSelect);
    glow(btn, false);

    // 2) SUBMIT — move to "Submit Answer", highlight, click
    const submit = $('submit-btn');
    await cursorToEl(submit, 750);
    glow(submit, true);
    await wait(300);
    clickPulse(submit);
    glow(submit, false);
    app.submitAnswer();   // shows ✅/❌, reveals Next
    await wait(T.qFeedback);

    // 3) NEXT — move to the Next button, highlight, click
    const nb = $('next-btn');
    if (nb && !nb.classList.contains('hidden')) {
      await cursorToEl(nb, 750);
      glow(nb, true);
      await wait(300);
      clickPulse(nb);
      glow(nb, false);
      app.nextQuestion();
    }
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
        await cursorToEl(ta, 800); glow(ta, true);                    // cursor into the prompt
        ta.value = WRITTEN[id]; app._updateWordCount(id, ta); ta.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(T.writtenRead);                                     // linger so viewers can read
        glow(ta, false);
      }
    }
    await wait(600);
    const submit = $('submit-written-btn');
    if (submit) { submit.scrollIntoView({ behavior: 'smooth', block: 'center' }); await wait(700); }
    await cursorClick(submit, 850, 350);                              // → submitWrittenResponses
    await wait(T.writtenSubmit);
    const panel = $('written-success-panel');
    if (panel && !panel.classList.contains('hidden')) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(500);
      const btn = panel.querySelector('button');
      await cursorClick(btn, 850, 350);   // → showEndScreen (results + confetti)
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
    makeCursor();
    await wait(T.welcome);   app.showReadAloudIntro();
    await wait(T.readAloud); app.showDirections();
    await wait(T.directions); app.showLogin();
    await wait(600);

    // LOGIN — cursor picks "Mr. O", types the PIN, clicks Sign In
    const sel = $('name-select');
    await cursorToEl(sel, 900);
    glow(sel, true); await wait(350);
    sel.value = 'Mr. O (Teacher)';
    app.onNameSelect();
    glow(sel, false);
    await wait(T.nameSelect);

    const pin = $('student-pin');
    await cursorToEl(pin, 750);
    glow(pin, true);
    pin.value = '';
    for (const ch of '1234') { pin.value += ch; await wait(140); }
    glow(pin, false);
    await wait(T.pinType);

    await cursorClick(document.querySelector('.sign-in-btn'), 800, 350);  // → attemptLogin → startTest
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
