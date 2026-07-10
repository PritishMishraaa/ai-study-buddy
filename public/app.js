// ---------- Setup ----------
if (window['pdfjsLib']) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const STORAGE_KEY = 'studybuddy_notes_v1';
const state = {
  notes: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
  quiz: [],
  quizScore: { correct: 0, answered: 0 },
  cards: [],
};

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('is-active');
  });
});

// ---------- Toast ----------
function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, ms);
}

// ---------- Notes persistence ----------
function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
  renderNotes();
}

function renderNotes() {
  const wrap = document.getElementById('noteCards');
  if (!state.notes.length) {
    wrap.innerHTML = '<div class="empty-state">Nothing pinned yet — add a PDF or paste some notes above.</div>';
    return;
  }
  wrap.innerHTML = state.notes.map((n, i) => `
    <div class="notecard" style="--tilt:${(i % 2 === 0 ? -1 : 1) * (1 + (i % 3))}deg">
      <h3>${escapeHtml(n.title)}</h3>
      <p>${escapeHtml(n.text.slice(0, 140))}${n.text.length > 140 ? '…' : ''}</p>
      <button class="remove-btn" data-idx="${i}">unpin</button>
    </div>
  `).join('');
  wrap.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.notes.splice(Number(btn.dataset.idx), 1);
      saveNotes();
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function combinedNotesText() {
  return state.notes.map(n => `## ${n.title}\n${n.text}`).join('\n\n').slice(0, 60000);
}

// ---------- File upload ----------
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('is-dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('is-dragover');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

async function handleFiles(fileList) {
  for (const file of fileList) {
    try {
      let text = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }
      if (!text.trim()) {
        toast(`Couldn't find text in ${file.name}`);
        continue;
      }
      state.notes.push({ title: file.name.replace(/\.[^.]+$/, ''), text: text.trim() });
    } catch (err) {
      console.error(err);
      toast(`Failed to read ${file.name}`);
    }
  }
  saveNotes();
  fileInput.value = '';
}

async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(it => it.str).join(' ') + '\n';
  }
  return text;
}

document.getElementById('addPasteBtn').addEventListener('click', () => {
  const ta = document.getElementById('pasteText');
  const text = ta.value.trim();
  if (!text) { toast('Paste something first'); return; }
  state.notes.push({ title: 'Pasted notes ' + (state.notes.length + 1), text });
  ta.value = '';
  saveNotes();
  toast('Pinned!');
});

renderNotes();

// ---------- Ask ----------
const chatLog = document.getElementById('chatLog');
const askForm = document.getElementById('askForm');
const askInput = document.getElementById('askInput');
const askBtn = document.getElementById('askBtn');

function addChatMsg(role, html) {
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (role === 'user' ? 'chat-msg-user' : 'chat-msg-bot');
  div.innerHTML = `<span class="chat-avatar">${role === 'user' ? '🙋' : '🖍️'}</span><div class="chat-bubble">${html}</div>`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  return div;
}

askForm.addEventListener('submit', async e => {
  e.preventDefault();
  const q = askInput.value.trim();
  if (!q) return;
  if (!state.notes.length) { toast('Pin some notes first'); return; }

  addChatMsg('user', escapeHtml(q));
  askInput.value = '';
  askBtn.disabled = true;
  const loadingMsg = addChatMsg('bot', '<span class="spinner"></span>thinking...');

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, notes: combinedNotesText() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    loadingMsg.querySelector('.chat-bubble').innerHTML = escapeHtml(data.answer).replace(/\n/g, '<br>');
  } catch (err) {
    console.error(err);
    loadingMsg.querySelector('.chat-bubble').textContent = "Couldn't reach the AI. Check the server is running / API key is set, then try again.";
  } finally {
    askBtn.disabled = false;
  }
});

// ---------- Quiz ----------
document.getElementById('genQuizBtn').addEventListener('click', async () => {
  if (!state.notes.length) { toast('Pin some notes first'); return; }
  const count = document.getElementById('quizCount').value;
  const btn = document.getElementById('genQuizBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Generating...';
  const area = document.getElementById('quizArea');
  area.innerHTML = '';

  try {
    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: combinedNotesText(), count }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    state.quiz = data.questions;
    state.quizScore = { correct: 0, answered: 0 };
    renderQuiz();
  } catch (err) {
    console.error(err);
    toast("Couldn't generate the quiz — try again");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate quiz';
  }
});

function renderQuiz() {
  const area = document.getElementById('quizArea');
  const tally = document.getElementById('quizTally');
  tally.hidden = state.quiz.length === 0;
  updateTally();

  area.innerHTML = state.quiz.map((q, qi) => `
    <div class="quiz-q" data-qi="${qi}">
      <h4>${qi + 1}. ${escapeHtml(q.question)}</h4>
      ${q.options.map((opt, oi) => `<button class="quiz-opt" data-oi="${oi}">${escapeHtml(opt)}</button>`).join('')}
      <div class="quiz-explain" hidden></div>
    </div>
  `).join('');

  area.querySelectorAll('.quiz-q').forEach(qEl => {
    const qi = Number(qEl.dataset.qi);
    const q = state.quiz[qi];
    qEl.querySelectorAll('.quiz-opt').forEach(optBtn => {
      optBtn.addEventListener('click', () => {
        const oi = Number(optBtn.dataset.oi);
        const opts = qEl.querySelectorAll('.quiz-opt');
        opts.forEach(o => o.disabled = true);
        opts[q.correctIndex].classList.add('is-correct');
        if (oi !== q.correctIndex) optBtn.classList.add('is-wrong');
        const ex = qEl.querySelector('.quiz-explain');
        if (q.explanation) { ex.textContent = q.explanation; ex.hidden = false; }
        state.quizScore.answered++;
        if (oi === q.correctIndex) state.quizScore.correct++;
        updateTally();
      });
    });
  });
}

function updateTally() {
  document.getElementById('tallyText').textContent =
    `Score: ${state.quizScore.correct} / ${state.quizScore.answered} answered (of ${state.quiz.length})`;
}

// ---------- Flashcards ----------
document.getElementById('genCardsBtn').addEventListener('click', async () => {
  if (!state.notes.length) { toast('Pin some notes first'); return; }
  const count = document.getElementById('cardCount').value;
  const btn = document.getElementById('genCardsBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Generating...';
  const deck = document.getElementById('cardDeck');
  deck.innerHTML = '';

  try {
    const res = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: combinedNotesText(), count }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    state.cards = data.cards;
    renderCards();
  } catch (err) {
    console.error(err);
    toast("Couldn't generate flashcards — try again");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate flashcards';
  }
});

function renderCards() {
  const deck = document.getElementById('cardDeck');
  deck.innerHTML = state.cards.map((c, i) => `
    <div class="flashcard" data-i="${i}">
      <div class="flashcard-inner">
        <div class="flashcard-face flashcard-front">${escapeHtml(c.front)}</div>
        <div class="flashcard-face flashcard-back">${escapeHtml(c.back)}</div>
      </div>
    </div>
  `).join('');
  deck.querySelectorAll('.flashcard').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('is-flipped'));
  });
}
