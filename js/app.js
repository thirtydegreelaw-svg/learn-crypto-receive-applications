/* =========================================================
   CryptoAcademy — Application logic
   ========================================================= */

var lessons = [];
var completed = new Set();
var editingId = null;
var isAdmin = false;

/* ---------- STATE ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(LS.lessons);
    lessons = raw ? JSON.parse(raw) : structuredClone(DEFAULT_LESSONS);
  } catch { lessons = structuredClone(DEFAULT_LESSONS); }

  try {
    completed = new Set(JSON.parse(localStorage.getItem(LS.completed) || '[]'));
  } catch { completed = new Set(); }
}
function saveLessons() { localStorage.setItem(LS.lessons, JSON.stringify(lessons)); }
function saveCompleted() { localStorage.setItem(LS.completed, JSON.stringify([...completed])); }

/* ---------- TOAST ---------- */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- RENDER: LESSONS ---------- */
function renderLessons() {
  const grid = document.getElementById('lessonGrid');
  const levelClass = { beginner: 'badge-beginner', intermediate: 'badge-intermediate', advanced: 'badge-advanced' };

  grid.innerHTML = lessons.map(l => `
    <article class="card ${completed.has(l.id) ? 'is-done' : ''}" data-open="${esc(l.id)}">
      <div class="done-ring">✓</div>
      <div class="card-top">
        <span class="lesson-icon">${esc(l.icon || '📘')}</span>
        <span class="badge ${levelClass[l.level] || 'badge-beginner'}">${esc(l.level)}</span>
      </div>
      <h3>${esc(l.title)}</h3>
      <p>${esc(l.summary)}</p>
      <div class="card-foot">
        <span class="time">⏱ ${esc(l.duration || '5 min')}</span>
        <span class="btn btn-ghost btn-sm">Read →</span>
      </div>
    </article>
  `).join('') || `<p class="muted">No lessons yet. Sign in as admin to add some.</p>`;

  document.getElementById('statLessons').textContent = lessons.length;
  updateProgress();
}

function updateProgress() {
  const total = lessons.length;
  const done = lessons.filter(l => completed.has(l.id)).length;
  document.getElementById('progressPill').innerHTML = `<b>${done}</b> / ${total} completed`;
  document.getElementById('sProgress').textContent = total ? Math.round(done / total * 100) + '%' : '0%';
  document.getElementById('sLessons').textContent = total;
}

/* ---------- LESSON MODAL ---------- */
function openLesson(id) {
  const l = lessons.find(x => x.id === id);
  if (!l) return;
  const isDone = completed.has(l.id);

  document.getElementById('modalContent').innerHTML = `
    <span class="badge badge-${esc(l.level)}">${esc(l.level)}</span>
    <h2>${esc(l.icon || '📘')} ${esc(l.title)}</h2>
    <div class="modal-meta">
      <span>⏱ ${esc(l.duration || '5 min')}</span>
      <span>${isDone ? '✅ Completed' : '○ Not completed'}</span>
    </div>
    <div class="modal-body">
      ${(l.content || []).map(p => `<p>${esc(p)}</p>`).join('')}
    </div>
    ${(l.keyPoints && l.keyPoints.length) ? `
      <div class="keypoints">
        <h4>Key takeaways</h4>
        <ul>${l.keyPoints.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
      </div>` : ''}
    <div style="margin-top:26px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn ${isDone ? 'btn-ghost' : 'btn-primary'}" onclick="toggleComplete('${esc(l.id)}')">
        ${isDone ? 'Mark as not completed' : '✓ Mark as completed'}
      </button>
      <button class="btn btn-ghost" onclick="closeLesson()">Close</button>
    </div>
  `;

  const modal = document.getElementById('lessonModal');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLesson() {
  document.getElementById('lessonModal').hidden = true;
  document.body.style.overflow = '';
}

function toggleComplete(id) {
  if (completed.has(id)) { completed.delete(id); toast('Marked as not completed'); }
  else { completed.add(id); toast('Nice — lesson completed ✓'); }
  saveCompleted();
  renderLessons();
  openLesson(id);
}

/* ---------- QUIZ ---------- */
function renderQuiz() {
  document.getElementById('quizQuestions').innerHTML = QUIZ.map((q, i) => `
    <div class="quiz-q" data-q="${i}">
      <p class="q-text">${i + 1}. ${esc(q.q)}</p>
      <div class="options">
        ${q.options.map((o, j) => `
          <label class="option">
            <input type="radio" name="q${i}" value="${j}">
            <span>${esc(o)}</span>
          </label>`).join('')}
      </div>
    </div>
  `).join('');
}

function submitQuiz(e) {
  e.preventDefault();
  let score = 0;
  let answered = 0;

  QUIZ.forEach((q, i) => {
    const chosen = document.querySelector(`input[name="q${i}"]:checked`);
    const block = document.querySelector(`.quiz-q[data-q="${i}"]`);
    block.querySelectorAll('.option').forEach(o => o.classList.remove('correct', 'wrong'));

    const labels = block.querySelectorAll('.option');
    labels[q.answer].classList.add('correct');

    if (chosen) {
      answered++;
      if (Number(chosen.value) === q.answer) score++;
      else labels[Number(chosen.value)].classList.add('wrong');
    }
  });

  if (answered < QUIZ.length) {
    toast(`You answered ${answered}/${QUIZ.length} — unanswered count as wrong`);
  }

  const pct = Math.round(score / QUIZ.length * 100);
  const best = Math.max(pct, Number(localStorage.getItem(LS.quiz) || 0));
  localStorage.setItem(LS.quiz, best);

  const msg = pct === 100 ? '🏆 Perfect score! You really know your stuff.'
            : pct >= 60   ? '👍 Solid work — review the modules you missed.'
            :               '📚 Worth another pass through the modules.';

  document.getElementById('quizResult').innerHTML =
    `<div class="quiz-result">You scored ${score} / ${QUIZ.length} (${pct}%) · Best: ${best}%<br><span class="muted" style="font-weight:400">${msg}</span></div>`;

  updateAdminStats();
}

/* ---------- FAQ ---------- */
function renderFaq() {
  document.getElementById('faqList').innerHTML = FAQS.map((f, i) => `
    <div class="faq-item" data-faq="${i}">
      <button class="faq-q" type="button" onclick="toggleFaq(${i})">
        ${esc(f.q)}<span>+</span>
      </button>
      <div class="faq-a"><p>${esc(f.a)}</p></div>
    </div>
  `).join('');
}
function toggleFaq(i) {
  document.querySelector(`.faq-item[data-faq="${i}"]`).classList.toggle('open');
}

/* ---------- ADMIN: LOGIN ---------- */
function showAdmin() {
  document.getElementById('homeView').hidden = true;
  document.getElementById('adminView').hidden = false;
  window.scrollTo(0, 0);

  if (sessionStorage.getItem('ca_session') === 'ok') {
    isAdmin = true;
    document.getElementById('loginScreen').hidden = true;
    document.getElementById('dashboard').hidden = false;
    renderAdmin();
  } else {
    document.getElementById('loginScreen').hidden = false;
    document.getElementById('dashboard').hidden = true;
  }
}

function showHome() {
  document.getElementById('adminView').hidden = true;
  document.getElementById('homeView').hidden = false;
  window.scrollTo(0, 0);
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  const err = document.getElementById('loginError');

  if (u === ADMIN_USER && p === ADMIN_PASS) {
    err.hidden = true;
    isAdmin = true;
    sessionStorage.setItem('ca_session', 'ok');
    document.getElementById('loginForm').reset();
    document.getElementById('loginScreen').hidden = true;
    document.getElementById('dashboard').hidden = false;
    renderAdmin();
    toast('Welcome back, admin ✓');
  } else {
    err.textContent = 'Invalid credentials. Try admin / crypto123.';
    err.hidden = false;
    document.getElementById('password').value = '';
  }
}

function logout() {
  isAdmin = false;
  sessionStorage.removeItem('ca_session');
  document.getElementById('dashboard').hidden = true;
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('loginError').hidden = true;
  toast('Signed out');
}

/* ---------- ADMIN: DASHBOARD ---------- */
function renderAdmin() {
  const tbody = document.getElementById('adminTable');
  tbody.innerHTML = lessons.map(l => `
    <tr>
      <td>
        <div class="cell-title">
          <span class="ic">${esc(l.icon || '📘')}</span>
          <span>${esc(l.title)}</span>
        </div>
      </td>
      <td><span class="badge badge-${esc(l.level)}">${esc(l.level)}</span></td>
      <td class="muted">${esc(l.duration || '5 min')}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-ghost btn-sm" onclick="editLesson('${esc(l.id)}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteLesson('${esc(l.id)}')">Delete</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="muted" style="text-align:center;padding:26px">No lessons yet — add one above.</td></tr>`;

  updateAdminStats();
  renderWebinarRegistrations();
}

function showApplications() {
  const panel = document.getElementById('webinarRegistrationsPanel');
  if (!panel) return;
  renderWebinarRegistrations();
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  panel.style.outline = '2px solid var(--cyan)';
  setTimeout(() => { panel.style.outline = ''; }, 1400);
}

function renderWebinarRegistrations() {
  const tbody = document.getElementById('webinarAdminTable');
  if (!tbody) return;
  let records = [];
  try { records = JSON.parse(localStorage.getItem('cryptoWebinarRegistrations') || '[]'); }
  catch (_) { records = []; }
  records.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  const dateFilter = document.getElementById('webinarDateFilter')?.value || '';
  if (dateFilter) {
    records = records.filter(r => {
      const d = new Date(r.registeredAt);
      const localDate = [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
      return localDate === dateFilter;
    });
  }
  const escCell = value => String(value || '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const total = document.getElementById('webinarTotal');
  const pending = document.getElementById('webinarPending');
  if (total) total.textContent = records.length;
  if (pending) pending.textContent = records.filter(r => (r.paymentStatus || 'Pending') !== 'Paid').length;
  tbody.innerHTML = records.map(r => `
    <tr>
      <td>${escCell(new Date(r.registeredAt).toLocaleString('en-IN'))}</td>
      <td>${escCell(r.fullName)}</td>
      <td>${escCell(r.mobile)}</td>
      <td>${escCell(r.email)}</td>
      <td>${escCell(r.address)}</td>
      <td><span class="badge badge-beginner">${escCell(r.paymentStatus || 'Pending')}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:20px">No registrations saved in this browser yet.</td></tr>';
}

function exportWebinarRegistrations() {
  let records = [];
  try { records = JSON.parse(localStorage.getItem('cryptoWebinarRegistrations') || '[]'); }
  catch (_) { records = []; }
  const columns = ['registeredAt','fullName','mobile','email','address','paymentStatus'];
  const csvCell = value => '"' + String(value || '').replace(/"/g, '""') + '"';
  const csv = [columns.join(','), ...records.map(r => columns.map(c => csvCell(r[c])).join(','))].join('\\r\\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'webinar-registrations.csv'; a.click();
  URL.revokeObjectURL(url);
}

function updateAdminStats() {
  document.getElementById('sLessons').textContent = lessons.length;
  const done = lessons.filter(l => completed.has(l.id)).length;
  document.getElementById('sProgress').textContent =
    lessons.length ? Math.round(done / lessons.length * 100) + '%' : '0%';
  const best = localStorage.getItem(LS.quiz);
  document.getElementById('sQuiz').textContent = best ? best + '%' : '—';
}

/* ---------- ADMIN: CRUD ---------- */
function handleLessonForm(e) {
  e.preventDefault();

  const data = {
    icon: document.getElementById('fIcon').value.trim() || '📘',
    title: document.getElementById('fTitle').value.trim(),
    level: document.getElementById('fLevel').value,
    duration: document.getElementById('fDuration').value.trim() || '5 min',
    summary: document.getElementById('fSummary').value.trim(),
    content: document.getElementById('fContent').value
      .split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
    keyPoints: document.getElementById('fPoints').value
      .split('\n').map(p => p.trim()).filter(Boolean)
  };

  if (!data.title || !data.summary || !data.content.length) {
    toast('Title, summary and content are required');
    return;
  }

  if (editingId) {
    const idx = lessons.findIndex(l => l.id === editingId);
    if (idx > -1) lessons[idx] = { ...lessons[idx], ...data };
    toast('Lesson updated ✓');
  } else {
    lessons.push({ id: 'l' + Date.now(), ...data });
    toast('Lesson added ✓');
  }

  saveLessons();
  resetForm();
  renderLessons();
  renderAdmin();
}

function editLesson(id) {
  const l = lessons.find(x => x.id === id);
  if (!l) return;
  editingId = id;

  document.getElementById('editId').value = id;
  document.getElementById('fIcon').value = l.icon || '📘';
  document.getElementById('fTitle').value = l.title;
  document.getElementById('fLevel').value = l.level;
  document.getElementById('fDuration').value = l.duration || '5 min';
  document.getElementById('fSummary').value = l.summary;
  document.getElementById('fContent').value = (l.content || []).join('\n\n');
  document.getElementById('fPoints').value = (l.keyPoints || []).join('\n');

  document.getElementById('formTitle').textContent = 'Edit lesson';
  document.getElementById('saveBtn').textContent = 'Save changes';
  document.getElementById('cancelEdit').hidden = false;
  document.getElementById('formTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteLesson(id) {
  const l = lessons.find(x => x.id === id);
  if (!l) return;
  if (!confirm(`Delete "${l.title}"? This cannot be undone.`)) return;
  lessons = lessons.filter(x => x.id !== id);
  completed.delete(id);
  saveLessons(); saveCompleted();
  renderLessons(); renderAdmin();
  toast('Lesson deleted');
}

function resetForm() {
  editingId = null;
  document.getElementById('lessonForm').reset();
  document.getElementById('fIcon').value = '🪙';
  document.getElementById('fDuration').value = '5 min';
  document.getElementById('editId').value = '';
  document.getElementById('formTitle').textContent = 'Add a new lesson';
  document.getElementById('saveBtn').textContent = 'Add lesson';
  document.getElementById('cancelEdit').hidden = true;
}

function resetData() {
  if (!confirm('Reset all lessons to the original demo content? Your edits will be lost.')) return;
  localStorage.removeItem(LS.lessons);
  lessons = structuredClone(DEFAULT_LESSONS);
  saveLessons();
  resetForm();
  renderLessons();
  renderAdmin();
  toast('Demo content restored');
}

/* ---------- HERO TICKER (demo data) ---------- */
function initTicker() {
  const priceEl = document.getElementById('demoPrice');
  const changeEl = document.getElementById('demoChange');
  const sparkEl = document.getElementById('spark');

  let price = 62000 + Math.random() * 8000;
  const series = Array.from({ length: 22 }, () => 0.3 + Math.random() * 0.7);

  function draw() {
    const max = Math.max(...series);
    sparkEl.innerHTML = series.map(v =>
      `<i style="height:${Math.round(v / max * 100)}%"></i>`
    ).join('');
  }

  function tick() {
    price += (Math.random() - 0.48) * 420;
    series.push(0.3 + Math.random() * 0.7);
    series.shift();
    const change = ((price - 60000) / 60000 * 100);

    priceEl.textContent = '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '% today';
    changeEl.style.color = change >= 0 ? 'var(--green)' : 'var(--red)';
    draw();
  }

  draw();
  tick();
  setInterval(tick, 2600);
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  document.getElementById('year').textContent = new Date().getFullYear();

  renderLessons();
  renderQuiz();
  renderFaq();
  initTicker();
  updateAdminStats();

  document.getElementById('adminBtn').addEventListener('click', showAdmin);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  document.getElementById('lessonGrid').addEventListener('click', e => {
    const card = e.target.closest('[data-open]');
    if (card) openLesson(card.dataset.open);
  });

  document.getElementById('lessonModal').addEventListener('click', e => {
    if (e.target.id === 'lessonModal') closeLesson();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLesson();
  });

  document.getElementById('quizForm').addEventListener('submit', submitQuiz);
  document.getElementById('lessonForm').addEventListener('submit', handleLessonForm);

  document.getElementById('progressPill').addEventListener('click', () => {
    document.getElementById('modules').scrollIntoView({ behavior: 'smooth' });
  });
});