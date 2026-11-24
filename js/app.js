/* =========================================================
   CryptoAcademy — Public site logic
   ========================================================= */

function loadState() {
  // Use getters to be safe
  window.lessons = getLessons();
  try {
    window.completed = new Set(JSON.parse(localStorage.getItem(LS.completed) || '[]'));
  } catch { window.completed = new Set(); }
}
function saveCompleted() {
  localStorage.setItem(LS.completed, JSON.stringify([...window.completed]));
}

/* ---------- TOAST ---------- */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- RENDER LESSONS ---------- */
function renderLessons() {
  const grid = document.getElementById('lessonGrid');
  if (!grid) return;
  const lv = { beginner:'badge-beginner', intermediate:'badge-intermediate', advanced:'badge-advanced' };

  grid.innerHTML = window.lessons.map(l => `
    <article class="card ${window.completed.has(l.id) ? 'is-done' : ''}" data-open="${esc(l.id)}">
      <div class="done-ring">✓</div>
      <div class="card-top">
        <span class="lesson-icon">${esc(l.icon || '📘')}</span>
        <span class="badge ${lv[l.level] || 'badge-beginner'}">${esc(l.level)}</span>
      </div>
      <h3>${esc(l.title)}</h3>
      <p>${esc(l.summary)}</p>
      <div class="card-foot">
        <span class="time">⏱ ${esc(l.duration || '5 min')}</span>
        <span class="btn btn-ghost btn-sm">Read →</span>
      </div>
    </article>`).join('') || `<p class="muted">No lessons yet.</p>`;

  const statEl = document.getElementById('statLessons');
  if (statEl) statEl.textContent = window.lessons.length;
  updateProgress();
}

function updateProgress() {
  const total = window.lessons.length;
  const done = window.lessons.filter(l => window.completed.has(l.id)).length;
  const pill = document.getElementById('progressPill');
  if (pill) pill.innerHTML = `<b>${done}</b> / ${total} completed`;
}

/* ---------- LESSON MODAL ---------- */
function openLesson(id) {
  const l = window.lessons.find(x => x.id === id);
  if (!l) return;
  const isDone = window.completed.has(l.id);

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
    </div>`;

  document.getElementById('lessonModal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeLesson() {
  document.getElementById('lessonModal').hidden = true;
  document.body.style.overflow = '';
}
function toggleComplete(id) {
  if (window.completed.has(id)) { window.completed.delete(id); toast('Marked as not completed'); }
  else { window.completed.add(id); toast('Lesson completed ✓'); }
  saveCompleted(); renderLessons(); openLesson(id);
}

/* ---------- QUIZ ---------- */
function renderQuiz() {
  const el = document.getElementById('quizQuestions');
  if (!el) return;
  const quizData = getQuiz(); // Fetch directly
  el.innerHTML = quizData.map((q, i) => `
    <div class="quiz-q" data-q="${i}">
      <p class="q-text">${i + 1}. ${esc(q.q)}</p>
      <div class="options">
        ${q.options.map((o, j) => `
          <label class="option">
            <input type="radio" name="q${i}" value="${j}">
            <span>${esc(o)}</span>
          </label>`).join('')}
      </div>
    </div>`).join('');
}

function submitQuiz(e) {
  e.preventDefault();
  let score = 0, answered = 0;
  const quizData = getQuiz();

  quizData.forEach((q, i) => {
    const chosen = document.querySelector(`input[name="q${i}"]:checked`);
    const block = document.querySelector(`.quiz-q[data-q="${i}"]`);
    if (!block) return;
    block.querySelectorAll('.option').forEach(o => o.classList.remove('correct', 'wrong'));
    const labels = block.querySelectorAll('.option');
    if(labels[q.answer]) labels[q.answer].classList.add('correct');
    
    if (chosen) {
      answered++;
      if (Number(chosen.value) === q.answer) score++;
      else labels[Number(chosen.value)].classList.add('wrong');
    }
  });

  if (answered < quizData.length) toast(`Answered ${answered}/${quizData.length} — blanks count as wrong`);

  const pct = Math.round(score / quizData.length * 100);
  const best = Math.max(pct, Number(localStorage.getItem(LS.quiz) || 0));
  localStorage.setItem(LS.quiz, best);

  const msg = pct === 100 ? '🏆 Perfect score!' : pct >= 60 ? '👍 Solid work.' : '📚 Worth another pass.';
  document.getElementById('quizResult').innerHTML =
    `<div class="quiz-result">Scored ${score} / ${quizData.length} (${pct}%) · Best: ${best}%<br>
     <span class="muted" style="font-weight:400">${msg}</span></div>`;
}

/* ---------- FAQ ---------- */
function renderFaq() {
  const el = document.getElementById('faqList');
  if (!el) return;
  const faqData = getFaqs(); // Fetch directly
  el.innerHTML = faqData.map((f, i) => `
    <div class="faq-item" data-faq="${i}">
      <button class="faq-q" type="button" onclick="toggleFaq(${i})">
        ${esc(f.q)}<span>+</span>
      </button>
      <div class="faq-a"><p>${esc(f.a)}</p></div>
    </div>`).join('');
}
function toggleFaq(i) {
  const el = document.querySelector(`.faq-item[data-faq="${i}"]`);
  if(el) el.classList.toggle('open');
}

/* ---------- HERO TICKER (Fixed) ---------- */
function initTicker() {
  const priceEl = document.getElementById('demoPrice');
  const changeEl = document.getElementById('demoChange');
  const sparkEl = document.getElementById('spark');
  
  // Safety check: if elements don't exist, stop.
  if (!priceEl || !changeEl || !sparkEl) return;

  let price = 62000 + Math.random() * 8000;
  // Generate initial sparkline data
  const series = Array.from({ length: 22 }, () => 0.3 + Math.random() * 0.7);

  function draw() {
    const max = Math.max(...series);
    sparkEl.innerHTML = series.map(v => 
      `<i style="height:${Math.round((v / max) * 100)}%"></i>`
    ).join('');
  }

  function tick() {
    price += (Math.random() - 0.48) * 420;
    series.push(0.3 + Math.random() * 0.7); 
    series.shift();
    
    const chg = ((price - 60000) / 60000 * 100);
    
    // Update DOM
    priceEl.textContent = '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    changeEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '% today';
    changeEl.style.color = chg >= 0 ? 'var(--green)' : 'var(--red)';
    draw();
  }

  draw(); 
  tick(); 
  setInterval(tick, 2600);
}

/* ---------- HERO PROMO ---------- */
function getSafeLink(url) {
  const u = String(url || '').trim();
  if (/^(https?:\/\/|\/|\.\/|#)/i.test(u)) return u;
  return 'webinar.html';
}


async function renderHeroPromo() {
  const container = document.getElementById('heroPromo');
  const heroBtn = document.getElementById('heroWebinarBtn');

  if (!container) return;

  container.innerHTML = '';
  if (heroBtn) heroBtn.hidden = true;

  try {
    const supabase = window.supabaseClient;
    if (!supabase) throw new Error('Supabase client not available');

    const { data: p, error } = await supabase
      .from('webinar_promotions')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!p) return;

    const safeLink = url => {
      const u = String(url || '').trim();
      return /^(https?:\/\/|\/|\.\/|#)/i.test(u)
        ? u : 'webinar.html';
    };

    const card = document.createElement('section');
    card.className = 'promo-banner';

    const content = document.createElement('div');
    content.className = 'promo-content';

    const badge = document.createElement('div');
    badge.className = 'promo-label';
    badge.textContent = p.badge || 'SPECIAL WEBINAR';

    const title = document.createElement('h2');
    title.textContent = p.title || '';

    const desc = document.createElement('p');
    desc.textContent = p.description || '';

    const details = document.createElement('div');
    details.className = 'promo-details';

    if (p.webinar_date) {
      const s = document.createElement('span');
      s.textContent = '📅 ' + p.webinar_date;
      details.append(s);
    }

    if (p.webinar_time) {
      const s = document.createElement('span');
      s.textContent = '🕒 ' + p.webinar_time;
      details.append(s);
    }

    if (p.fee != null) {
      const s = document.createElement('span');
      s.textContent = '💰 ₹' + p.fee;
      details.append(s);
    }

    const link = document.createElement('a');
    link.className = 'promo-btn';
    link.textContent = (p.button_text || 'Register Now') + ' →';
    link.href = safeLink(p.registration_url);

    content.append(badge, title);
    if (p.description) content.append(desc);
    content.append(details, link);
    card.append(content);

    if (p.banner_url) {
      const img = document.createElement('img');
      img.src = p.banner_url;
      img.alt = p.title || 'Webinar Banner';
      img.loading = 'lazy';
      card.append(img);
    }

    container.replaceChildren(card);

    if (heroBtn) {
      heroBtn.hidden = false;
      heroBtn.textContent = '🎓 Join Live Webinar' +
        (p.fee != null ? ' · ₹' + p.fee : '');
      heroBtn.href = safeLink(p.registration_url);
    }

  } catch (error) {
    console.error('Homepage Banner Error:', error);
    container.innerHTML = '';
    if (heroBtn) heroBtn.hidden = true;
  }
}


/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  try { loadState(); } catch(e) { console.error("State load error", e); }
  
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  try { renderLessons(); } catch(e) { console.error("Lessons error", e); }
  try { renderQuiz(); } catch(e) { console.error("Quiz error", e); }
  try { renderFaq(); } catch(e) { console.error("FAQ error", e); }
  
  // Ticker runs no matter what
  try { initTicker(); } catch(e) { console.error("Ticker error", e); }
  
  try { renderHeroPromo(); } catch(e) { console.error("Promo error", e); }

  // Event Listeners
  const grid = document.getElementById('lessonGrid');
  if (grid) {
    grid.addEventListener('click', e => {
      const card = e.target.closest('[data-open]');
      if (card) openLesson(card.dataset.open);
    });
  }

  const modal = document.getElementById('lessonModal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target.id === 'lessonModal') closeLesson();
    });
  }
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLesson();
  });

  const quizForm = document.getElementById('quizForm');
  if (quizForm) quizForm.addEventListener('submit', submitQuiz);
});