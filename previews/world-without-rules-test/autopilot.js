/* ═══════════════════════════════════════════════════════
   AUTOPILOT — Preview / demo driver (PREVIEW VERSION ONLY)
   Plays the test like a fast-forward movie:
     Welcome → Read-aloud → Directions → Login (Mr. O / 1234)
     → 10 sample questions per part (Vocab, Comp, Cloze)
     → Written part (answers auto-typed & submitted)
     → end-screen confetti between parts → final scores page.
   • 10 questions are a RANDOM sample shown in original order.
   • All network submissions are blocked — the live Google Sheet
     is never touched.
   • The original site is never modified; this file exists only
     in the preview copy.
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SAMPLE = 10;   // questions shown per multiple-choice part

  const T = {
    welcome:      2600,
    readAloud:    3200,
    directions:   6500,
    nameSelect:   1400,
    pinType:      1700,
    sectionStart: 1900,
    qRead:        1800,   // "reading" pause per question
    qSelect:      1000,
    qConfirm:     1100,
    endScreen:    4200,   // linger on each end-screen (confetti)
    writtenType:  750,    // pause between typed written answers
    writtenSubmit:2000,
    finale:       1600
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

  /* ---- block ALL submissions to the live Google Sheet ---- */
  function blockNetwork() {
    const origFetch = window.fetch ? window.fetch.bind(window) : null;
    window.fetch = function (url) {
      const u = typeof url === 'string' ? url : (url && url.url) || '';
      if (u.indexOf('script.google.com') !== -1 || u.indexOf('macros/s/') !== -1) {
        return Promise.resolve(new Response('', { status: 200 }));
      }
      return origFetch ? origFetch.apply(window, arguments) : Promise.resolve(new Response('', { status: 200 }));
    };
    if (navigator.sendBeacon) navigator.sendBeacon = () => true;
  }

  /* ---- floating PREVIEW banner ---- */
  function addBanner() {
    const b = document.createElement('div');
    b.id = 'demo-banner';
    b.innerHTML = '👀 <strong>PREVIEW</strong> — auto-playing a sample. Showing 10 questions per part. '
      + '<span id="demo-pause" style="display:inline-block;background:rgba(255,255,255,.22);border-radius:6px;padding:2px 10px;cursor:pointer;margin-left:8px;font-weight:700;">⏸ Pause</span>'
      + '<span id="demo-replay" style="text-decoration:underline;cursor:pointer;margin-left:10px;">↻ Replay</span>';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#6c5ce7,#e056a0);color:#fff;text-align:center;font:600 13px/1.3 system-ui,sans-serif;padding:9px 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);';
    document.body.appendChild(b);
    const c = document.querySelector('.container');
    if (c) c.style.marginTop = '40px';
    $('demo-pause').onclick = () => setPaused(!_paused);
    $('demo-replay').onclick = () => { try { localStorage.clear(); } catch (e) {} location.reload(); };
  }

  /* ---- random sample of N questions, kept in original order ---- */
  function sampleBank(section) {
    const raw = section === 'vocab' ? window.VOCAB_BANK
              : section === 'comp'  ? window.COMP_BANK
              :                       window.CLOZE_BANK;
    const idx = raw.map((_, i) => i);
    // Fisher–Yates partial shuffle
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const pick = idx.slice(0, Math.min(SAMPLE, raw.length)).sort((a, b) => a - b);
    return pick.map(i => raw[i]);  // original choice order → answer index stays valid
  }

  /* ---- swap each section to a 10-question sample ---- */
  function patchStartSession() {
    const orig = app.startSession.bind(app);
    app.startSession = function (section) {
      orig(section);
      if (section === 'vocab' || section === 'comp' || section === 'cloze') {
        app.currentBank  = sampleBank(section);
        app.maxScore     = computeMaxScore(app.currentBank);
        app.currentIndex = 0;
        app.score        = 0;
        app.renderQuestion();
      }
    };
  }

  /* ---- fast read-lock + auto-answer correctly ---- */
  function patchReadTimer() {
    app.startReadTimer = function () {
      const bar = $('reading-timer-bar');
      $('reading-count').textContent = '…';
      bar.classList.remove('hidden');
      document.querySelectorAll('.answer-btn').forEach(x => { x.classList.add('locked-choice'); x.disabled = true; });
      setTimeout(() => {
        bar.classList.add('hidden');
        document.querySelectorAll('.answer-btn').forEach(x => { x.classList.remove('locked-choice'); x.disabled = false; });
        answerCurrent();
      }, T.qRead);
    };
  }

  /* pick answers like a real student — mostly right, ~18% miss */
  function chooseAnswer(q) {
    const correct = Array.isArray(q.answer) ? q.answer : [q.answer];
    if (Math.random() < 0.18) {
      const wrong = [];
      for (let i = 0; i < q.choices.length; i++) if (!correct.includes(i)) wrong.push(i);
      if (wrong.length) return [wrong[Math.floor(Math.random() * wrong.length)]];
    }
    return correct;
  }

  async function answerCurrent() {
    const q = app.currentBank[app.currentIndex];
    if (!q) return;
    const picks = chooseAnswer(q);
    const btns = document.querySelectorAll('.answer-btn');
    await wait(T.qSelect);
    picks.forEach(i => { app.selectedIndices.add(i); if (btns[i]) btns[i].classList.add('selected'); });
    $('confirm-btn').classList.remove('hidden');
    await wait(T.qConfirm);
    app.confirmAnswer();
    await wait(T.qConfirm);
    const nb = $('next-btn');
    if (nb && !nb.classList.contains('hidden')) app.nextQuestion();
  }

  /* ---- after each part's end-screen, linger then continue ---- */
  function patchFinish() {
    const orig = app._finishSession.bind(app);
    app._finishSession = function () {
      orig();                                  // end-screen + confetti if high score
      setTimeout(() => {
        const cb = $('continue-btn');
        const wrap = $('continue-btn-wrap');
        if (cb && wrap && !wrap.classList.contains('hidden')) cb.click();
      }, T.endScreen);
    };
  }

  /* ---- drive the written-response part: type + submit + continue ---- */
  function patchWritten() {
    const orig = app.showWrittenScreen.bind(app);
    app.showWrittenScreen = function () {
      orig();
      driveWritten();
    };
  }

  const SAMPLE_WRITTEN = {
    W1: "Without government and laws, two big problems would happen. First, there would be no police or firefighters, so people would not be safe when there was danger or a crime. Second, no one would build or fix roads, so it would be hard and unsafe to travel. Both problems are dangerous because people could get hurt and no one would be there to help them.",
    W2: "The author means that government, laws, and public services make the world safer and more fair. At the beginning the story shows how laws protect people. In the middle it explains how services like schools and roads help everyone. At the end it says the world would be different without them. I agree, because without rules people would not be protected and life would be much harder.",
    W3: "I agree that government, laws, and public services are necessary for a safe and fair society. One detail from the story is that laws keep people safe by telling everyone the rules they must follow. Another detail is that public services like firefighters and schools help the whole community. Without these things, people would not be protected and it would not be fair for everyone."
  };

  async function driveWritten() {
    await wait(900);
    for (const id of ['W1', 'W2', 'W3']) {
      const ta = $('textarea-' + id);
      if (ta) {
        ta.focus();
        ta.value = SAMPLE_WRITTEN[id];
        app._updateWordCount(id, ta);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await wait(T.writtenType);
    }
    await wait(T.writtenSubmit);
    app.submitWrittenResponses();                 // shows success panel
    await wait(T.writtenSubmit);
    // success panel "Continue to Cloze →"
    const panel = $('written-success-panel');
    if (panel && !panel.classList.contains('hidden')) {
      const btn = panel.querySelector('button');
      if (btn) btn.click();
    }
  }

  /* ---- no 30-second lock on the final scores page ---- */
  function patchScoreLock() {
    app._startScoreLock = function () {
      const bar = $('sb-lock-bar'); if (bar) bar.classList.add('hidden');
      document.querySelectorAll('#scoreboard-screen button').forEach(b => { b.disabled = false; b.style.opacity = '1'; });
    };
  }

  /* ---- the movie ---- */
  async function run() {
    try { localStorage.removeItem('wwrt_session_v1'); } catch (e) {}
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
    app.attemptLogin();
    await wait(T.sectionStart);
    app.startNextSection();   // → vocab; everything else auto-chains
  }

  function boot() {
    if (typeof app === 'undefined') { setTimeout(boot, 50); return; }
    blockNetwork();
    addBanner();
    patchStartSession();
    patchReadTimer();
    patchFinish();
    patchWritten();
    patchScoreLock();
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
