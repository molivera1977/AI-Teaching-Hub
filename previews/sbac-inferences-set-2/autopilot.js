/* ═══════════════════════════════════════════════════════
   AUTOPILOT — Preview / demo driver (PREVIEW VERSION ONLY)
   SBAC Reading Review (Inferences Set 2) — plays the WHOLE
   test (all 6 passages, all questions), sped up, then the
   results page.
   • Name auto-set to "Mr. O" · realistic (misses a few).
   • Text-to-speech skipped and all network submissions blocked
     (the live Google Apps Script endpoint is never contacted).
   • This file lives only in the preview copy; the original
     SBAC site is never modified. (Original already uses a
     free-text name box, so it had no stored student data.)
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const T = {
    cover: 2000, name: 1900, startPause: 1400,
    passageRead: 2400, perQuestion: 550, betweenPart: 600,
    passageGap: 1200, finale: 1600
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
    b.innerHTML = '👀 <strong>PREVIEW</strong> — auto-playing the full review (sped up). '
      + '<span id="demo-pause" style="display:inline-block;background:rgba(255,255,255,.22);border-radius:6px;padding:2px 10px;cursor:pointer;margin-left:8px;font-weight:700;">⏸ Pause</span>'
      + '<span id="demo-replay" style="text-decoration:underline;cursor:pointer;margin-left:10px;">↻ Replay</span>';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#6c5ce7,#e056a0);color:#fff;text-align:center;font:600 13px/1.3 system-ui,sans-serif;padding:9px 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);';
    document.body.appendChild(b);
    document.body.style.paddingTop = '38px';
    document.getElementById('demo-pause').onclick = () => setPaused(!_paused);
    document.getElementById('demo-replay').onclick = () => { try { localStorage.clear(); } catch (e) {} location.reload(); };
  }

  /* ---- animated demo cursor ---- */
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
    el.style.transform = on ? 'scale(1.03)' : '';
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
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(450);
    await cursorToEl(el, dur || 800);
    glow(el, true);
    await wait(hold || 300);
    clickPulse(el);
    glow(el, false);
    if (typeof el.click === 'function') el.click();
  }
  /* move to a specific answer choice and click it (fires its onclick → answer()) */
  async function clickChoice(p, qi, part, idx) {
    const btn = document.getElementById('cb-' + p + '-' + qi + '-' + part + '-' + idx);
    if (!btn) return false;
    await cursorClick(btn, 800, 300);
    return true;
  }
  /* on the first two questions, tap the question's 🔊 button to show
     read-aloud (reads the question + highlights words), then stop */
  async function maybeReadAloud(p, qi) {
    if (readAloudDemos >= 2) return;
    const card = document.getElementById('qcard-' + p + '-' + qi);
    if (!card) return;
    const rb = card.querySelector('.q-read-btn');
    if (!rb) return;
    readAloudDemos++;
    await cursorClick(rb, 800, 320);     // → readQuestionCard → speakWithHighlight (wraps .tts-word, attempts audio)
    await wait(180);
    // manually walk-highlight the words so it shows even if autoplay audio is blocked
    const words = Array.from(card.querySelectorAll('.tts-word')).slice(0, 18);
    for (let i = 0; i < words.length; i++) {
      words.forEach(w => w.classList.remove('speaking'));
      words[i].classList.add('speaking');
      try { words[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
      await wait(190);
    }
    words.forEach(w => w.classList.remove('speaking'));
    try { if (typeof stopReading === 'function') stopReading(); } catch (e) {}
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    await wait(450);
  }

  /* skip text-to-speech and the speech-gated locking */
  function patchSpeechAndLocks() {
    if (typeof window.speakText === 'function') window.speakText = function (t, onDone) { if (typeof onDone === 'function') onDone(); };
    if (typeof window.lockAllChoices === 'function') window.lockAllChoices = function () {};
    if (typeof window.unlockAllChoices === 'function') window.unlockAllChoices = function () {};
    if (typeof window.speakProgress === 'function') window.speakProgress = function () {};
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  }

  /* mostly correct, ~18% miss */
  function pick(obj) {
    if (Math.random() < 0.18) {
      const wrong = [0, 1, 2, 3].filter(i => i !== obj.correct);
      if (wrong.length) return wrong[Math.floor(Math.random() * wrong.length)];
    }
    return obj.correct;
  }

  async function driveReview() {
    for (let p = 0; p < passages.length; p++) {
      if (typeof showPassage === 'function') showPassage(p);
      window.scrollTo(0, 0);
      await wait(T.passageRead);
      const qs = passages[p].questions || [];
      for (let qi = 0; qi < qs.length; qi++) {
        const q = qs[qi];
        await maybeReadAloud(p, qi);   // demo read-aloud on the first two questions
        if (q.partA) {
          // two-part question — cursor clicks Part A then Part B
          if (!(await clickChoice(p, qi, 'a', pick(q.partA)))) answer(p, qi, 'a', pick(q.partA), q.partA.correct);
          await wait(T.betweenPart);
          if (!(await clickChoice(p, qi, 'b', pick(q.partB)))) answer(p, qi, 'b', pick(q.partB), q.partB.correct);
          await wait(T.perQuestion);
        } else {
          if (!(await clickChoice(p, qi, '', pick(q)))) answer(p, qi, '', pick(q), q.correct);
          await wait(T.perQuestion);
        }
      }
      await wait(T.passageGap);
    }
    // everything answered → cursor clicks Finish
    await wait(T.finale);
    const fb = document.getElementById('finishBtn');
    if (fb) {
      fb.disabled = false;
      fb.classList.add('finish-btn-ready');
      await cursorClick(fb, 850, 350);
    } else if (typeof tryFinish === 'function') {
      tryFinish();
    }
  }

  async function run() {
    makeCursor();
    await wait(T.cover);

    // COVER — cursor clicks "Start"
    const coverBtn = document.querySelector('.cover-btn');
    if (coverBtn) await cursorClick(coverBtn, 850, 350);          // → showNameScreen
    else if (typeof showNameScreen === 'function') showNameScreen();
    await wait(T.name);

    // NAME — cursor into the box, types "Mr. O"
    const inp = document.getElementById('nameInput');
    if (inp) {
      await cursorToEl(inp, 800);
      glow(inp, true);
      inp.focus();
      inp.value = '';
      for (const ch of 'Mr. O') { inp.value += ch; await wait(120); }
      glow(inp, false);
    }
    await wait(T.startPause);

    // BEGIN — cursor clicks "Begin Review →"
    const beginBtn = document.querySelector('.name-btn');
    if (beginBtn) await cursorClick(beginBtn, 850, 350);          // → startReview
    else if (typeof startReview === 'function') startReview();
    await wait(900);
    driveReview();
  }

  function boot() {
    if (typeof passages === 'undefined' || typeof answer !== 'function') { setTimeout(boot, 60); return; }
    blockNetwork();
    addBanner();
    patchSpeechAndLocks();
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
