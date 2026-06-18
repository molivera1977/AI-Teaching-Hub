(function () {
  // Inject Mr. AI widget HTML into the page
  var widget = document.createElement('div');
  widget.id = 'mrAiWidget';
  widget.className = 'mr-ai-widget';
  widget.innerHTML =
    '<button class="mr-ai-toggle" id="mrAiToggleBtn">\u{1F916} Ask Mr. AI</button>' +
    '<div class="mr-ai-panel" id="mrAiPanel">' +
      '<div class="mr-ai-header">' +
        '<span class="mr-ai-avatar">\u{1F916}</span>' +
        '<div class="mr-ai-header-text">' +
          '<div class="mr-ai-name">Mr. AI</div>' +
          '<div class="mr-ai-subtitle">Your Friendly Course Assistant</div>' +
        '</div>' +
        '<button class="mr-ai-close-btn" id="mrAiCloseBtn" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="mr-ai-messages" id="mrAiMessages">' +
        '<div class="mr-ai-bubble mr-ai-assistant">Hi there! I am Mr. AI, your friendly course helper. Got a question about anything you are learning? Just ask me!</div>' +
      '</div>' +
      '<div class="mr-ai-inputbar">' +
        '<textarea id="mrAiInput" class="mr-ai-textarea" placeholder="Type your question here..." rows="2"></textarea>' +
        '<button class="mr-ai-send-btn" id="mrAiSendBtn">Send</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(widget);

  document.getElementById('mrAiToggleBtn').addEventListener('click', mrAiToggle);
  document.getElementById('mrAiCloseBtn').addEventListener('click', mrAiToggle);
  document.getElementById('mrAiSendBtn').addEventListener('click', mrAiSend);
  document.getElementById('mrAiInput').addEventListener('keydown', mrAiKeyDown);

  var mrSystemPrimer = [
    { role: 'user', content: 'Before we start, can you explain who you are and what this course covers?' },
    { role: 'assistant', content: 'Of course! I\'m Mr. AI, your assistant for this AI teaching course. I answer questions in plain, friendly language — no tech jargon.\n\nThis course covers four AI tools:\n• Claude — great for writing, planning, and detailed tasks\n• ChatGPT — a great all-around tool for teaching\n• Gemini — great when connected to Google Docs and Google Classroom\n• Microsoft Copilot — great for teachers using Microsoft 365\n\nAll four tools are free (or have free versions) and work in any web browser — nothing to download.\n\nThe course has six lessons:\n• Lesson 1 — Writing Good Prompts (a prompt has four parts: Role, Task, Details, and Audience)\n• Lesson 2 — Creating Classroom Assignments (quizzes, reading passages, rubrics, and differentiation)\n• Lesson 3 — Using Screenshots (AI can read photos of worksheets, tests, and textbook pages)\n• Lesson 4 — Making Images and Visuals with AI\n• Lesson 5 — Save and Print What AI Creates\n• Lesson 6 — AI Can Build You a Website\n\nKey ideas I always use from the course:\n• A great prompt has four parts: Role (who you are), Task (what you want), Details (grade level, subject, format), and Audience (your students).\n• Five prompting strategies: Tell It Who You Are, Give the Full Context, Show an Example, Assign It a Role, and Ask for Options.\n• AI reads screenshots the same way it reads text — it sees the whole image, including worksheets, math problems, and instructions.\n• For copy and paste, I always recommend right-clicking first (not keyboard shortcuts) — that\'s how the course teaches it.\n\nWhenever you ask me something, I answer using the tools and ideas taught in this course. I keep things simple and practical for classroom teachers.' }
  ];

  var mrHistory = [];

  function mrAiToggle() {
    var p = document.getElementById('mrAiPanel');
    p.classList.toggle('open');
    if (p.classList.contains('open')) document.getElementById('mrAiInput').focus();
  }

  function mrAiKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); mrAiSend(); }
  }

  async function mrAiSend() {
    var inp = document.getElementById('mrAiInput');
    var msgs = document.getElementById('mrAiMessages');
    var btn = document.getElementById('mrAiSendBtn');
    var q = (inp.value || '').trim();
    if (!q) return;
    mrAddBubble(q, 'mr-ai-user');
    inp.value = ''; btn.disabled = true;
    var t = mrAddBubble('Mr. AI is thinking...', 'mr-ai-thinking');
    try {
      var r = await fetch('https://mr-ai-proxy.molivera1977.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: mrSystemPrimer.concat(mrHistory).concat([{ role: 'user', content: q }]) })
      });
      var d = await r.json();
      t.remove();
      if (d.content && d.content[0]) {
        var a = d.content[0].text;
        mrHistory.push({ role: 'user', content: q });
        mrHistory.push({ role: 'assistant', content: a });
        if (mrHistory.length > 20) mrHistory = mrHistory.slice(-20);
        mrAddBubble(a, 'mr-ai-assistant');
      } else {
        mrAddBubble('Sorry, I had a little trouble with that. Please try asking again.', 'mr-ai-assistant');
      }
    } catch (e) {
      t.remove();
      mrAddBubble('Oops! It looks like I lost my connection. Please check your internet and try again.', 'mr-ai-assistant');
    }
    btn.disabled = false;
    msgs.scrollTop = msgs.scrollHeight;
  }

  function mrAddBubble(txt, cls) {
    var msgs = document.getElementById('mrAiMessages');
    var b = document.createElement('div');
    b.className = 'mr-ai-bubble ' + cls;
    b.textContent = txt;
    msgs.appendChild(b);
    msgs.scrollTop = msgs.scrollHeight;
    return b;
  }
})();
