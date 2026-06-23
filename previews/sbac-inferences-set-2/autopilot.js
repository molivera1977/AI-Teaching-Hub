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
    passageRead: 2200, perQuestion: 950, betweenPart: 800,
    passageGap: 1300, finale: 1600
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
        if (q.partA) {
          answer(p, qi, 'a', pick(q.partA), q.partA.correct);
          await wait(T.betweenPart);
          answer(p, qi, 'b', pick(q.partB), q.partB.correct);
          await wait(T.perQuestion);
        } else {
          answer(p, qi, '', pick(q), q.correct);
          await wait(T.perQuestion);
        }
      }
      await wait(T.passageGap);
    }
    // everything answered → finish
    await wait(T.finale);
    const fb = document.getElementById('finishBtn');
    if (fb) { fb.disabled = false; fb.classList.add('finish-btn-ready'); fb.click(); }
    else if (typeof tryFinish === 'function') tryFinish();
  }

  async function run() {
    await wait(T.cover);
    if (typeof showNameScreen === 'function') showNameScreen();
    await wait(T.name);
    const inp = document.getElementById('nameInput');
    if (inp) { inp.value = ''; for (const ch of 'Mr. O') { inp.value += ch; await wait(110); } }
    await wait(T.startPause);
    if (typeof startReview === 'function') startReview();   // → launchReview → passage 0
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
