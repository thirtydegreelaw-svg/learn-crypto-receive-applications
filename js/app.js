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




let heroPromoTimer = null;


async function renderHeroPromo() {
  const container = document.getElementById('heroPromo');
  const heroBtn = document.getElementById('heroWebinarBtn');

  if (!container) return;

  container.innerHTML = '';
  if (heroBtn) heroBtn.hidden = true;

  if (heroPromoTimer) {
    clearInterval(heroPromoTimer);
    heroPromoTimer = null;
  }

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

    const images = Array.isArray(p.banner_urls) && p.banner_urls.length
      ? p.banner_urls
      : (p.banner_url ? [p.banner_url] : []);

    if (!images.length) return;

    const safeLink = url => {
      const u = String(url || '').trim();
      return /^https?:\/\//i.test(u) ? u : 'webinar.html';
    };

    if (!document.getElementById('hero-slider-style')) {
      const style = document.createElement('style');
      style.id = 'hero-slider-style';

      style.textContent = `
        #heroPromo .poster-frame {
          width: 100%;
          max-width: 850px;
          margin: auto;
          text-align: center;
          position: relative;
          box-sizing: border-box;
        }

        #heroPromo .poster-image {
          display: block;
          width: 100%;
          max-height: 600px;
          object-fit: contain;
          border: 2px solid #38bdf8;
          border-radius: 14px;
          box-shadow: 0 0 20px rgba(56,189,248,.55);
          animation: posterSlide 0.7s ease-out both;
        }

        #heroPromo .poster-arrow {
          position: absolute;
          top: 40%;
          z-index: 2;
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 50%;
          background: rgba(0,0,0,.65);
          color: white;
          font-size: 25px;
          cursor: pointer;
        }

        #heroPromo .poster-prev { left: 12px; }
        #heroPromo .poster-next { right: 12px; }

        #heroPromo .poster-dots {
          display: flex;
          justify-content: center;
          gap: 9px;
          margin-top: 13px;
        }

        #heroPromo .poster-dot {
          width: 10px;
          height: 10px;
          border: 0;
          border-radius: 50%;
          background: #999;
          cursor: pointer;
          padding: 0;
        }

        #heroPromo .poster-dot.active {
          background: #2563eb;
          transform: scale(1.35);
        }

        #heroPromo .poster-register {
          display: inline-block;
          margin-top: 16px;
          padding: 14px 30px;
          border-radius: 10px;
          background: #2563eb;
          color: white;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 0 15px rgba(37,99,235,.5);
        }

        @keyframes posterSlide {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @media (max-width: 600px) {
          #heroPromo .poster-image {
            max-height: 420px;
            border-radius: 10px;
          }

          #heroPromo .poster-arrow {
            width: 34px;
            height: 34px;
            font-size: 20px;
          }

          #heroPromo .poster-register {
            padding: 12px 24px;
          }
        }
      `;

      document.head.appendChild(style);
    }

    const frame = document.createElement('div');
    frame.className = 'poster-frame';

    const img = document.createElement('img');
    img.className = 'poster-image';
    img.alt = 'Promotional Poster';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'poster-arrow poster-prev';
    prev.textContent = '‹';
    prev.setAttribute('aria-label', 'Previous poster');

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'poster-arrow poster-next';
    next.textContent = '›';
    next.setAttribute('aria-label', 'Next poster');

    const dots = document.createElement('div');
    dots.className = 'poster-dots';

    const link = document.createElement('a');
    link.className = 'poster-register';
    link.textContent = p.button_text || 'Register Now';
    link.href = safeLink(p.registration_url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    let currentIndex = 0;

    function showPoster(index) {
      currentIndex = (index + images.length) % images.length;

      img.style.animation = 'none';
      void img.offsetWidth;
      img.style.animation = 'posterSlide 0.7s ease-out both';

      img.src = images[currentIndex];
      img.alt = 'Poster ' + (currentIndex + 1);

      dots.querySelectorAll('.poster-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });
    }

    images.forEach((image, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'poster-dot';
      dot.setAttribute('aria-label', 'Show poster ' + (index + 1));
      dot.addEventListener('click', () => {
        showPoster(index);
        restartTimer();
      });
      dots.appendChild(dot);
    });

    function restartTimer() {
      if (heroPromoTimer) clearInterval(heroPromoTimer);

      if (images.length > 1) {
        heroPromoTimer = setInterval(() => {
          showPoster(currentIndex + 1);
        }, 7000);
      }
    }

    prev.addEventListener('click', () => {
      showPoster(currentIndex - 1);
      restartTimer();
    });

    next.addEventListener('click', () => {
      showPoster(currentIndex + 1);
      restartTimer();
    });

    frame.appendChild(img);

    if (images.length > 1) {
      frame.appendChild(prev);
      frame.appendChild(next);
    }

    frame.appendChild(dots);
    frame.appendChild(link);

    container.appendChild(frame);

    showPoster(0);
    restartTimer();

  } catch (error) {
    console.error('Homepage Banner Error:', error);
    container.innerHTML = '';
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