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
  function loadApplications() {
    applications = getRegistrations();
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
  function deleteApplication(id) {
    const rec = applications.find(a => a.id === id);
    if (!rec) return;
    if (!confirm(`Delete application from "${rec.name}"?`)) return;
    applications = applications.filter(a => a.id !== id);
    persistApplications();
    renderApplications();
    renderOverview();
    toast('Application deleted');
  }

  /* =========================================================
     FRONT BANNER (HERO PROMO)
     ========================================================= */
  function loadPromoForm() {
    const p = getPromo();
    $('prBadge').value       = p.badge || '';
    $('prTitle').value       = p.title || '';
    $('prDescription').value = p.description || '';
    $('prDate').value        = p.webinarDate || '';
    $('prTime').value        = p.webinarTime || '';
    $('prFee').value         = p.fee ?? '';
    $('prButton').value      = p.buttonText || '';
    $('prUrl').value         = p.registrationUrl || '';
    $('prBannerUrl').value   = p.bannerUrl || '';
    $('prActive').checked    = !!p.active;
    renderPromoPreview();
  }
  function renderPromoPreview() {
    const el = $('promoPreview');
    if (!$('prActive').checked) {
      el.innerHTML = '<p class="muted">Banner is hidden on the website.</p>';
      return;
    }
    const banner = $('prBannerUrl').value.trim();
    const img = banner
      ? `<div style="margin-top:14px"><img src="${esc(banner)}" alt="Banner"
           style="max-width:100%;border-radius:10px;max-height:180px;object-fit:cover"></div>`
      : '';
    el.innerHTML = `
      <span class="preview-badge">${esc($('prBadge').value || 'SPECIAL WEBINAR')}</span>
      <div class="preview-title">${esc($('prTitle').value || 'Untitled promo')}</div>
      <div class="preview-sub">${esc($('prDescription').value || 'No description.')}</div>
      <div class="promo-details" style="margin-bottom:16px">
        ${$('prDate').value ? `<span>📅 ${esc($('prDate').value)}</span>` : ''}
        ${$('prTime').value ? `<span>🕒 ${esc($('prTime').value)}</span>` : ''}
        ${$('prFee').value ? `<span>💰 ₹${esc($('prFee').value)}</span>` : ''}
      </div>
      <span class="btn btn-primary btn-sm">${esc($('prButton').value || 'Register Now')}</span>
      ${img}`;
  }
    async function submitPromo(e) {
    e.preventDefault();

    const file = document.getElementById('bannerFile')?.files?.[0];
    let bannerUrl = $('prBannerUrl').value.trim();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;

    // 1. Upload image to Supabase Storage
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast('Image must be smaller than 5 MB');
        return;
      }

      btn.textContent = 'Uploading image...';
      btn.disabled = true;

      const extension = file.name.split('.').pop().toLowerCase();
      // Using Date.now() instead of crypto.randomUUID() for better browser support
      const filePath = `banners/${Date.now()}-${Math.floor(Math.random() * 1000)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('webinar-banners')
        .upload(filePath, file);

      if (uploadError) {
        toast('Upload failed: ' + uploadError.message);
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      const { data } = supabase.storage
        .from('webinar-banners')
        .getPublicUrl(filePath);

      bannerUrl = data.publicUrl;
      $('prBannerUrl').value = bannerUrl;
    }

    // 2. Save data to Supabase Database (Not LocalStorage)
    btn.textContent = 'Saving...';

    const payload = {
      is_active:        $('prActive').checked,
      badge:            $('prBadge').value.trim(),
      title:            $('prTitle').value.trim(),
      description:      $('prDescription').value.trim(),
      webinar_date:     $('prDate').value || null,
      webinar_time:     $('prTime').value.trim(),
      fee:              $('prFee').value === '' ? null : Number($('prFee').value),
      button_text:      $('prButton').value.trim(),
      registration_url: $('prUrl').value.trim(),
      banner_url:       bannerUrl,
      updated_at:       new Date().toISOString()
    };

    const { error: dbError } = await supabase
      .from('webinar_promotions')
      .insert([payload]);

    btn.textContent = originalText;
    btn.disabled = false;

    if (dbError) {
      toast('Database error: ' + dbError.message);
      note('promoMsg', 'Error saving to database.', 'err');
      return;
    }

    // Reset the file input so it doesn't upload the same file twice
    if(document.getElementById('bannerFile')) {
      document.getElementById('bannerFile').value = '';
    }

    renderPromoPreview();
    note('promoMsg', 'Banner saved to Supabase successfully!', 'ok');
    toast('Banner saved');
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

  function refreshAll() {
    loadLessons();
    loadApplications();
    loadPromoForm();
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