/* =========================================================
   CryptoAcademy — Admin panel logic
   Depends on: js/data.js
   ========================================================= */
import { supabase } from './supabase.js';

(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  let lessons       = [];
  let editingId     = null;
  let applications  = [];
  let promoBannerUrls = [];

  /* ---------------- toast + notes ---------------- */
  let toastTimer;
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }
  function note(id, text, kind) {
    const el = $(id); if (!el) return;
    el.textContent = text || '';
    el.className = 'message' + (kind ? ' ' + kind : '');
    el.style.display = text ? 'block' : 'none';
  }

  
/* =========================================================
   AUTH
   ========================================================= */

async function handleLogin(e) {
  e.preventDefault();

  const email = $('username').value.trim();
  const password = $('password').value;

  $('loginError').hidden = true;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    $('loginError').textContent = error.message;
    $('loginError').hidden = false;
    return;
  }

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    await supabase.auth.signOut();
    $('loginError').textContent =
      adminError?.message || 'You are not authorized as an admin.';
    $('loginError').hidden = false;
    return;
  }

  $('loginForm').reset();
  showDashboard();
  toast('Welcome back, admin');
}

function showDashboard() {
  $('loginScreen').hidden = true;
  $('dashboard').hidden = false;
  refreshAll();
}

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    toast(error.message);
    return;
  }

  $('dashboard').hidden = true;
  $('loginScreen').hidden = false;
  toast('Signed out');
}



  /* =========================================================
     VIEW SWITCHING
     ========================================================= */
  const VIEW_META = {
    overview:     { title: 'Overview',    eyebrow: 'Dashboard' },
    applications: { title: 'Applications', eyebrow: 'Webinar signups' },
    lessons:      { title: 'Courses',      eyebrow: 'Content manager' },
    banner:       { title: 'Front Banner', eyebrow: 'Homepage promo' }
  };
  function switchView(name) {
    if (!VIEW_META[name]) name = 'overview';
    document.querySelectorAll('.view').forEach(v =>
      v.classList.toggle('active', v.id === 'view-' + name));
    document.querySelectorAll('.side-link[data-view]').forEach(b =>
      b.classList.toggle('active', b.dataset.view === name));
    $('pageTitle').textContent   = VIEW_META[name].title;
    $('viewEyebrow').textContent = VIEW_META[name].eyebrow;
  }

  /* =========================================================
     COURSES
     ========================================================= */
  function loadLessons() {
    try {
      const raw = localStorage.getItem(LS.lessons);
      lessons = raw ? JSON.parse(raw) : structuredClone(DEFAULT_LESSONS);
    } catch { lessons = structuredClone(DEFAULT_LESSONS); }
  }
  const persistLessons = () =>
    localStorage.setItem(LS.lessons, JSON.stringify(lessons));

  function renderLessonTable() {
    const badge = {
      beginner: 'badge-beginner',
      intermediate: 'badge-intermediate',
      advanced: 'badge-advanced'
    };
    $('lessonRows').innerHTML = lessons.map(l => `
      <tr>
        <td>
          <div class="cell-title" style="display:flex;align-items:center;gap:10px;font-weight:600">
            <span style="width:30px;height:30px;border-radius:8px;display:grid;place-items:center;
              background:var(--surface-2);font-size:.95rem">${esc(l.icon || '📘')}</span>
            <span>${esc(l.title)}</span>
          </div>
        </td>
        <td><span class="badge ${badge[l.level] || 'badge-beginner'}">${esc(l.level)}</span></td>
        <td class="muted">${esc(l.duration || '5 min')}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-ghost btn-sm" data-edit="${esc(l.id)}">Edit</button>
          <button class="btn btn-danger btn-sm" data-del="${esc(l.id)}">Delete</button>
        </td>
      </tr>`).join('')
      || `<tr><td colspan="4" class="muted" style="text-align:center;padding:26px">No courses yet.</td></tr>`;
  }

  function resetLessonForm() {
    editingId = null;
    $('lessonForm').reset();
    $('lIcon').value = '📘';
    $('lDuration').value = '5 min';
    $('lessonFormTitle').textContent = 'Add a new course';
    $('lessonSave').textContent = 'Save course';
    $('lessonCancel').hidden = true;
  }

  function submitLesson(e) {
    e.preventDefault();
    const data = {
      icon: $('lIcon').value.trim() || '📘',
      title: $('lTitle').value.trim(),
      level: $('lLevel').value,
      duration: $('lDuration').value.trim() || '5 min',
      summary: $('lSummary').value.trim(),
      content: $('lContent').value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean),
      keyPoints: $('lPoints').value.split('\n').map(s => s.trim()).filter(Boolean)
    };
    if (!data.title || !data.summary || !data.content.length) {
      note('lessonMsg', 'Title, summary and at least one paragraph are required.', 'err');
      return;
    }
    const wasEdit = !!editingId;
    if (wasEdit) {
      const i = lessons.findIndex(l => l.id === editingId);
      if (i > -1) lessons[i] = Object.assign({}, lessons[i], data);
    } else {
      lessons.push(Object.assign({ id: 'l' + Date.now() }, data));
    }
    persistLessons();
    resetLessonForm();
    renderLessonTable();
    renderOverview();
    note('lessonMsg', wasEdit ? 'Course updated.' : 'Course created.', 'ok');
    toast(wasEdit ? 'Course updated' : 'Course created');
  }

  function editLesson(id) {
    const l = lessons.find(x => x.id === id);
    if (!l) return;
    editingId = id;
    $('lIcon').value = l.icon || '📘';
    $('lTitle').value = l.title;
    $('lLevel').value = l.level;
    $('lDuration').value = l.duration || '5 min';
    $('lSummary').value = l.summary;
    $('lContent').value = (l.content || []).join('\n\n');
    $('lPoints').value = (l.keyPoints || []).join('\n');
    $('lessonFormTitle').textContent = 'Edit course';
    $('lessonSave').textContent = 'Save changes';
    $('lessonCancel').hidden = false;
    $('lessonFormTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deleteLesson(id) {
    const l = lessons.find(x => x.id === id);
    if (!l) return;
    if (!confirm(`Delete "${l.title}"? This cannot be undone.`)) return;
    lessons = lessons.filter(x => x.id !== id);
    const done = new Set(JSON.parse(localStorage.getItem(LS.completed) || '[]'));
    done.delete(id);
    localStorage.setItem(LS.completed, JSON.stringify([...done]));
    persistLessons();
    renderLessonTable();
    renderOverview();
    toast('Course deleted');
  }

  /* =========================================================
     APPLICATIONS
     ========================================================= */
  
async function loadApplications() {
  note('appMsg', 'Loading applications...', '');

  const { data, error } = await supabase
    .from('webinar_registrations')
    .select('id, full_name, mobile, email, address, registered_at, payment_status, payment_id')
    .order('registered_at', { ascending: false });

  if (error) {
    console.error('Applications loading error:', error);
    applications = [];
    renderApplications();
    note('appMsg', 'Loading failed: ' + error.message, 'err');
    renderOverview();
    return;
  }

  applications = (data || []).map(row => ({
    id: row.id,
    name: row.full_name,
    mobile: row.mobile,
    email: row.email,
    address: row.address,
    registeredAt: row.registered_at,
    payment: row.payment_status || 'Pending',
    paymentId: row.payment_id
  }));

  renderApplications();
  renderOverview();
  note('appMsg', applications.length + ' applications loaded.', 'ok');
}

  const persistApplications = () => saveRegistrations(applications);

  function filteredApplications() {
    const date = ($('webinarDateFilter').value || '').trim();
    if (!date) return applications;
    return applications.filter(a => (a.registeredAt || '').slice(0, 10) === date);
  }

  function renderApplications() {
    const rows = filteredApplications();
    const fmt = iso => {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      } catch { return iso; }
    };

    $('webinarAdminTable').innerHTML = rows.map(a => `
      <tr>
        <td class="muted" style="white-space:nowrap">${esc(fmt(a.registeredAt))}</td>
        <td>${esc(a.name)}</td>
        <td>${esc(a.mobile)}</td>
        <td>${esc(a.email)}</td>
        <td class="muted">${esc(a.address || '—')}</td>
        <td>
          <span class="badge ${a.payment === 'Paid' ? 'badge-beginner' : 'badge-advanced'}">
            ${esc(a.payment)}
          </span>
        </td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-ghost btn-sm" data-app-edit="${esc(a.id)}">Edit</button>
          <button class="btn btn-danger btn-sm" data-app-del="${esc(a.id)}">Delete</button>
        </td>
      </tr>`).join('')
      || `<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">
            ${applications.length ? 'No applications match the selected date.' : 'No applications yet.'}
          </td></tr>`;

    const all = applications;
    $('webinarTotal').textContent   = rows.length;
    $('webinarPaid').textContent    = rows.filter(a => a.payment === 'Paid').length;
    $('webinarPending').textContent = rows.filter(a => a.payment !== 'Paid').length;
    $('progressPill'); // unused here
  }

  function exportCsv() {
    const rows = filteredApplications();
    if (!rows.length) { note('appMsg', 'Nothing to export for the current filter.', 'err'); return; }

    const header = ['Registered', 'Name', 'Mobile', 'Email', 'Address', 'Payment'];
    const csvEsc = v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [header.join(',')].concat(
      rows.map(a => [
        a.registeredAt, a.name, a.mobile, a.email, a.address || '', a.payment
      ].map(csvEsc).join(','))
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'webinar-applications.csv';
    a.click(); URL.revokeObjectURL(url);
    toast('CSV exported');
  }

  /* add / edit application modal */
  function openAppModal(id) {
    const rec = id ? applications.find(a => a.id === id) : null;
    $('appModalTitle').textContent = rec ? 'Edit application' : 'Add application';
    $('aId').value      = rec ? rec.id : '';
    $('aName').value    = rec ? rec.name : '';
    $('aMobile').value  = rec ? rec.mobile : '';
    $('aEmail').value   = rec ? rec.email : '';
    $('aAddress').value = rec ? rec.address || '' : '';
    $('aPayment').value = rec ? rec.payment : 'Pending';
    $('appModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeAppModal() {
    $('appModal').hidden = true;
    document.body.style.overflow = '';
  }
  function submitApplication(e) {
    e.preventDefault();
    const id = $('aId').value;
    const data = {
      name:    $('aName').value.trim(),
      mobile:  $('aMobile').value.trim(),
      email:   $('aEmail').value.trim(),
      address: $('aAddress').value.trim(),
      payment: $('aPayment').value
    };
    if (!data.name || !data.mobile || !data.email) {
      toast('Name, mobile and email are required'); return;
    }
    if (id) {
      const i = applications.findIndex(a => a.id === id);
      if (i > -1) applications[i] = Object.assign({}, applications[i], data);
      toast('Application updated');
    } else {
      applications.push(Object.assign({
        id: 'r' + Date.now(),
        registeredAt: new Date().toISOString()
      }, data));
      toast('Application added');
    }
    persistApplications();
    renderApplications();
    renderOverview();
    closeAppModal();
  }
  
async function deleteApplication(id) {
  const rec = applications.find(a => a.id === id);
  if (!rec) return;

  if (!confirm(`Delete application from "${rec.name}" permanently?`)) return;

  try {
    const { data, error } = await supabase
      .from('webinar_registrations')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error('Delete blocked. Check Supabase DELETE policy.');
    }

    await loadApplications();
    renderApplications();
    renderOverview();
    toast('Application permanently deleted');

  } catch (error) {
    console.error('Delete error:', error);
    note('appMsg', 'Delete failed: ' + error.message, 'err');
  }
}


  /* =========================================================
     FRONT BANNER (HERO PROMO)
     ========================================================= */
  async function loadPromoForm() {
  const { data: p, error } = await supabase
    .from('webinar_promotions')
    .select('*')
    .order('updated_at', { ascending: false })
.limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    toast('Banner loading failed');
    return;
  }

  $('prBadge').value = p?.badge || '';
  $('prTitle').value = p?.title || '';
  $('prDescription').value = p?.description || '';
  $('prDate').value = p?.webinar_date || '';
  $('prTime').value = p?.webinar_time || '';
  $('prFee').value = p?.fee ?? '';
  $('prButton').value = p?.button_text || '';
  $('prUrl').value = p?.registration_url || '';
  promoBannerUrls = Array.isArray(p?.banner_urls)
  ? [...p.banner_urls]
  : (p?.banner_url ? [p.banner_url] : []);

$('prBannerUrl').value = promoBannerUrls[0] || '';
  $('prActive').checked = p?.is_active ?? false;

  renderPromoPreview();
}

async function loadCurrentBannerList() {
  const list = $('currentBannerList');

  const { data: banner, error } = await supabase
    .from('webinar_promotions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    list.textContent = 'Banner loading failed: ' + error.message;
    return;
  }

  if (!banner) {
    list.innerHTML = '<p class="muted">No banner found.</p>';
    return;
  }

  promoBannerUrls = Array.isArray(banner.banner_urls)
    ? [...banner.banner_urls]
    : (banner.banner_url ? [banner.banner_url] : []);

  if (promoBannerUrls.length === 0) {
    list.innerHTML = '<p class="muted">No posters uploaded yet.</p>';
    return;
  }

  list.innerHTML = promoBannerUrls.map((url, index) => `
    <div style="padding:12px;margin-bottom:12px;border:1px solid var(--border);border-radius:10px">
      <strong>Poster ${index + 1}</strong>
      <img src="${esc(url)}" alt="Poster ${index + 1}"
        style="display:block;width:100%;max-width:300px;margin:10px 0;border-radius:8px;object-fit:contain">

      <button type="button" class="btn btn-sm"
        data-poster-up="${index}" ${index === 0 ? 'disabled' : ''}>
        ↑ ऊपर
      </button>

      <button type="button" class="btn btn-sm"
        data-poster-down="${index}" ${index === promoBannerUrls.length - 1 ? 'disabled' : ''}>
        ↓ नीचे
      </button>

      <button type="button" class="btn btn-danger btn-sm"
        data-poster-delete="${index}">
        Delete
      </button>
    </div>
  `).join('');

  async function savePosterChanges() {
    const { error: saveError } = await supabase
      .from('webinar_promotions')
      .update({
        banner_urls: promoBannerUrls,
        banner_url: promoBannerUrls[0] || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', banner.id);

    if (saveError) {
      toast('Update failed: ' + saveError.message);
      return false;
    }

    $('prBannerUrl').value = promoBannerUrls[0] || '';
    await loadCurrentBannerList();
    renderPromoPreview();
    toast('Poster list updated');
    return true;
  }

  list.querySelectorAll('[data-poster-up]').forEach(button => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.posterUp);
      [promoBannerUrls[index - 1], promoBannerUrls[index]] =
        [promoBannerUrls[index], promoBannerUrls[index - 1]];
      await savePosterChanges();
    });
  });

  list.querySelectorAll('[data-poster-down]').forEach(button => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.posterDown);
      [promoBannerUrls[index + 1], promoBannerUrls[index]] =
        [promoBannerUrls[index], promoBannerUrls[index + 1]];
      await savePosterChanges();
    });
  });

  list.querySelectorAll('[data-poster-delete]').forEach(button => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.posterDelete);

      if (!confirm('क्या आप यह पोस्टर हटाना चाहते हैं?')) return;

      promoBannerUrls.splice(index, 1);
      await savePosterChanges();
    });
  });
}

  function renderPromoPreview() {
  const el = $('promoPreview');

  if (!$('prActive').checked) {
    el.innerHTML = '<p class="muted">Banner is hidden on the website.</p>';
    return;
  }

  const images = promoBannerUrls.length
    ? promoBannerUrls
    : ($('prBannerUrl').value.trim()
        ? [$('prBannerUrl').value.trim()]
        : []);

  if (!images.length) {
    el.innerHTML = '<p class="muted">अभी कोई पोस्टर अपलोड नहीं हुआ है।</p>';
    return;
  }

  el.innerHTML = `
    <div style="max-width:500px;margin:auto;text-align:center">
      <img
        src="${esc(images[0])}"
        alt="Poster Preview"
        style="
          display:block;
          width:100%;
          max-height:500px;
          object-fit:contain;
          border:2px solid #38bdf8;
          border-radius:14px;
          box-shadow:0 0 18px rgba(56,189,248,.55);
        "
      >

      <a
        href="${esc($('prUrl').value.trim() || '#')}"
        target="_blank"
        rel="noopener"
        class="btn btn-primary"
        style="display:inline-block;margin-top:14px;text-decoration:none"
      >
        ${esc($('prButton').value || 'Register Now')}
      </a>

      <p class="muted" style="margin-top:8px">
        ${images.length} Poster(s) uploaded
      </p>
    </div>
  `;
}  

async function submitPromo(e) {
  e.preventDefault();

  const files = Array.from(
    document.getElementById('bannerFile')?.files || []
  );

  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;

  btn.disabled = true;

  try {
    btn.textContent = 'Checking existing posters...';

    const { data: existing, error: findError } = await supabase
      .from('webinar_promotions')
      .select('id, banner_urls, banner_url')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    let bannerUrls = Array.isArray(existing?.banner_urls)
      ? [...existing.banner_urls]
      : [];

    // पुराने पोस्टर को सुरक्षित रखें
    if (bannerUrls.length === 0 && existing?.banner_url) {
      bannerUrls.push(existing.banner_url);
    }

    // सभी चुने हुए पोस्टर अपलोड करें
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error(file.name + ' is larger than 5 MB');
      }

      btn.textContent = 'Uploading ' + file.name + '...';

      const extension = file.name.split('.').pop().toLowerCase();
      const filePath =
        `banners/${Date.now()}-${Math.floor(Math.random() * 100000)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('webinar-banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('webinar-banners')
        .getPublicUrl(filePath);

      bannerUrls.push(data.publicUrl);
    }

    const payload = {
      is_active: $('prActive').checked,
      badge: $('prBadge').value.trim(),
      title: $('prTitle').value.trim(),
      description: $('prDescription').value.trim(),
      webinar_date: $('prDate').value || null,
      webinar_time: $('prTime').value.trim(),
      fee: $('prFee').value === '' ? null : Number($('prFee').value),
      button_text: $('prButton').value.trim(),
      registration_url: $('prUrl').value.trim(),
      banner_urls: bannerUrls,
      banner_url: bannerUrls[0] || '',
      updated_at: new Date().toISOString()
    };

    btn.textContent = 'Saving posters...';

    let saveResult;

    if (existing) {
      saveResult = await supabase
        .from('webinar_promotions')
        .update(payload)
        .eq('id', existing.id);
    } else {
      saveResult = await supabase
        .from('webinar_promotions')
        .insert(payload);
    }

    if (saveResult.error) throw saveResult.error;

    $('bannerFile').value = '';

    await loadPromoForm();
    await loadCurrentBannerList();
    renderPromoPreview();

    note('promoMsg', 'All posters saved successfully!', 'ok');
    toast('Posters saved successfully');

  } catch (error) {
    console.error('Banner Save Error:', error);
    note('promoMsg', 'Save failed: ' + error.message, 'err');
    toast('Upload error: ' + error.message);

  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}



  /* =========================================================
     OVERVIEW
     ========================================================= */
  function renderOverview() {
    const done = new Set(JSON.parse(localStorage.getItem(LS.completed) || '[]'));
    const doneCount = lessons.filter(l => done.has(l.id)).length;
    const best = localStorage.getItem(LS.quiz);

    $('ovApps').textContent    = applications.length;
    $('ovPending').textContent = applications.filter(a => a.payment !== 'Paid').length;
    $('ovLessons').textContent = lessons.length;
    $('ovBest').textContent    = best ? best + '%' : '—';
    $('progressPill').innerHTML = `<b>${doneCount}</b> / ${lessons.length} completed`;
  }

  async function refreshAll() {
  loadLessons();
  loadApplications();
  await loadPromoForm();
  await loadCurrentBannerList();
  renderLessonTable();
  renderApplications();
  renderOverview();
}

  /* =========================================================
     BACKUP
     ========================================================= */
  function exportAll() {
    const data = {
      exportedAt: new Date().toISOString(),
      lessons: getLessons(),
      quiz: getQuiz(),
      faqs: getFaqs(),
      promo: getPromo(),
      registrations: getRegistrations()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cryptoacademy-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup exported');
  }
  function importAll(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (data.lessons)       writeJSON(LS.lessons, data.lessons);
        if (data.quiz)          writeJSON(LS.quizData, data.quiz);
        if (data.faqs)          writeJSON(LS.faqs, data.faqs);
        if (data.promo)         writeJSON(LS.promo, data.promo);
        if (data.registrations) writeJSON(LS.registrations, data.registrations);
        refreshAll();
        note('dataMsg', 'Backup imported.', 'ok');
        toast('Backup imported');
      } catch {
        note('dataMsg', 'Invalid backup file.', 'err');
      }
    };
    r.readAsText(file);
  }
  function resetAll() {
    if (!confirm('Reset everything to demo content? Your edits will be lost.')) return;
    [LS.lessons, LS.quizData, LS.faqs, LS.promo, LS.completed, LS.registrations]
      .forEach(k => localStorage.removeItem(k));
    refreshAll();
    note('dataMsg', 'Demo content restored.', 'ok');
    toast('Demo content restored');
  }

  /* =========================================================
     WIRING
     ========================================================= */
  function bind() {
    $('loginForm').addEventListener('submit', handleLogin);
    $('logoutBtn').addEventListener('click', logout);

    document.querySelectorAll('.side-link[data-view]').forEach(btn =>
      btn.addEventListener('click', () => switchView(btn.dataset.view)));
    document.querySelectorAll('[data-goto]').forEach(btn =>
      btn.addEventListener('click', () => switchView(btn.dataset.goto)));

    /* courses */
    $('lessonForm').addEventListener('submit', submitLesson);
    $('lessonCancel').addEventListener('click', () => { resetLessonForm(); note('lessonMsg', ''); });
    $('lessonRows').addEventListener('click', e => {
      const ed = e.target.closest('[data-edit]');
      const dl = e.target.closest('[data-del]');
      if (ed) editLesson(ed.dataset.edit);
      if (dl) deleteLesson(dl.dataset.del);
    });

    /* applications */
    $('addAppBtn').addEventListener('click', () => openAppModal(null));
    $('webinarDateFilter').addEventListener('change', renderApplications);
    $('clearDateFilter').addEventListener('click', () => {
      $('webinarDateFilter').value = '';
      renderApplications();
    });
    $('exportCsv').addEventListener('click', exportCsv);

    $('webinarAdminTable').addEventListener('click', e => {
      const ed = e.target.closest('[data-app-edit]');
      const dl = e.target.closest('[data-app-del]');
      if (ed) openAppModal(ed.dataset.appEdit);
      if (dl) deleteApplication(dl.dataset.appDel);
    });
    $('appForm').addEventListener('submit', submitApplication);
    $('appModal').addEventListener('click', e => {
      if (e.target.id === 'appModal') closeAppModal();
    });

    /* banner */
    $('promoForm').addEventListener('submit', submitPromo);
    ['prBadge', 'prTitle', 'prDescription', 'prDate', 'prTime',
     'prFee', 'prButton', 'prUrl', 'prBannerUrl', 'prActive']
      .forEach(id => $(id).addEventListener('input', renderPromoPreview));

    /* backup */
    $('exportAll').addEventListener('click', exportAll);
    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) importAll(f);
      e.target.value = '';
    });
    $('resetAll').addEventListener('click', resetAll);
  }
/* ---------------- init ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  bind();

  $('loginScreen').hidden = false;
  $('dashboard').hidden = true;

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return;
  }

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    await supabase.auth.signOut();
    $('loginScreen').hidden = false;
    return;
  }

  showDashboard();
});
})();