/* ══════════════════════════════════════════════════════════════
   app.js  –  Core state, API helpers, navigation, calculations
   Tables: school_entries, lo_codes, bp_library
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ── GLOBAL STATE ── */
window.APP = {
  meta: {
    district: 'GANJAM', block: '', cluster: '', school: '',
    class: 'IV', subject: 'Mathematics', exam: 'SA-II', year: '2025-26', lang: 'en'
  },
  blueprint: [],   // [{id, qLabel, section, loCode, marks}]
  students:  [],   // [{id, roll, name}]
  marks:     {},   // { studentId: { blueprintItemId: value|'A' } }
  loMaster:  [],   // loaded from lo_codes table
  currentEntryId: null,
  configured: false
};

/* ── API HELPERS ── */
window.API = {
  async get(t, qs='') {
    const r = await fetch(`tables/${t}?limit=500${qs?'&'+qs:''}`);
    if (!r.ok) throw new Error(`GET ${t} failed: ${r.status}`);
    return r.json();
  },
  async getOne(t, id) {
    const r = await fetch(`tables/${t}/${id}`);
    if (!r.ok) throw new Error(`GET ${t}/${id} failed: ${r.status}`);
    return r.json();
  },
  async create(t, d) {
    const r = await fetch(`tables/${t}`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(d)
    });
    if (!r.ok) throw new Error(`POST ${t} failed: ${r.status}`);
    return r.json();
  },
  async patch(t, id, d) {
    const r = await fetch(`tables/${t}/${id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(d)
    });
    if (!r.ok) throw new Error(`PATCH ${t}/${id} failed: ${r.status}`);
    return r.json();
  },
  async remove(t, id) {
    const r = await fetch(`tables/${t}/${id}`, {method: 'DELETE'});
    if (!r.ok && r.status !== 204) throw new Error(`DELETE ${t}/${id} failed: ${r.status}`);
  }
};

/* ── UTILITIES ── */
window.genId = () => 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
window.esc   = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
window.tryJ  = (s) => { try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; } };

/* ── TOAST ── */
window.toast = function(msg, type='success') {
  const icons = { success:'check-circle', error:'times-circle', info:'info-circle', warning:'exclamation-triangle' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}"></i> ${msg}`;
  const container = document.getElementById('toastContainer');
  if (container) container.appendChild(el);
  setTimeout(() => el.remove(), 3800);
};

/* ── NAVIGATION ── */
function initNav() {
  document.querySelectorAll('.nav-btn[data-page], .dropdown-menu button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.page);
      document.getElementById('mobileNav')?.classList.remove('open');
    });
  });
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('mobileNav')?.classList.toggle('open');
  });
  // Dropdown toggle
  document.querySelectorAll('.dropdown-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.closest('.nav-dropdown')?.classList.toggle('open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
  });
}

window.navigateTo = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));
  window.scrollTo(0, 0);

  if (page === 'marks')     window.renderMarksTable?.();
  if (page === 'preview')   window.renderPreview?.();
  if (page === 'blueprint') {
    window.renderBlueprintTable?.();
    window.renderLOMaster?.();
    window.loadBpLibrary?.();
  }
  if (page === 'students')  window.renderStudentTable?.();
  if (page === 'dashboard') { updateDashboardStats(); loadSavedReports(); }
  if (page === 'cluster')   window.renderClusterReport?.();
  if (page === 'block')     window.renderBlockReport?.();
};

/* ── DASHBOARD ── */
function initDashboard() {
  document.getElementById('btnSaveConfig')?.addEventListener('click', saveConfig);
  document.getElementById('btnNewReport')?.addEventListener('click', newReport);
  document.getElementById('btnRefreshReports')?.addEventListener('click', loadSavedReports);

  // Sync meta fields live
  ['metaClass','metaSubject','metaExam','metaLang'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      const el = document.getElementById(id);
      const key = id.replace('meta','').toLowerCase();
      APP.meta[key] = el.value;
    });
  });
}

async function saveConfig() {
  const fv = id => document.getElementById(id)?.value?.trim() || '';
  APP.meta = {
    district: fv('metaDistrict') || 'GANJAM',
    block:    fv('metaBlock'),
    cluster:  fv('metaCluster'),
    school:   fv('metaSchool'),
    class:    document.getElementById('metaClass')?.value || '',
    subject:  document.getElementById('metaSubject')?.value || '',
    exam:     document.getElementById('metaExam')?.value || 'SA-II',
    year:     fv('metaYear') || '2025-26',
    lang:     document.getElementById('metaLang')?.value || 'en'
  };
  if (!APP.meta.class || !APP.meta.subject) {
    toast('Please select Class and Subject.', 'warning'); return;
  }

  const payload = {
    district: APP.meta.district, block: APP.meta.block,
    cluster:  APP.meta.cluster,  school: APP.meta.school,
    class:    APP.meta.class,    subject: APP.meta.subject,
    exam:     APP.meta.exam,     year: APP.meta.year, lang: APP.meta.lang,
    items:    JSON.stringify(APP.blueprint),
    students: JSON.stringify({ students: APP.students, marks: APP.marks }),
    total_students:     APP.students.length,
    total_marks_possible: APP.blueprint.reduce((s,i) => s + Number(i.marks||0), 0)
  };

  try {
    if (APP.currentEntryId) {
      await API.patch('school_entries', APP.currentEntryId, payload);
      toast('Configuration updated!');
    } else {
      const r = await API.create('school_entries', payload);
      APP.currentEntryId = r.id;
      toast('Configuration saved!');
    }
    APP.configured = true;
    updateSessionStatus();
    updateDashboardStats();
    loadSavedReports();
  } catch(e) {
    toast('Save failed: ' + e.message, 'error');
  }
}

function newReport() {
  if (!confirm('Start a new report? This will clear all current data.')) return;
  APP.currentEntryId = null;
  APP.configured = false;
  APP.blueprint = [];
  APP.students  = [];
  APP.marks     = {};
  APP.meta = { district:'GANJAM', block:'', cluster:'', school:'', class:'IV', subject:'Mathematics', exam:'SA-II', year:'2025-26', lang:'en' };
  syncMetaToForm();
  updateSessionStatus();
  updateDashboardStats();
  window.renderBlueprintTable?.();
  window.renderStudentTable?.();
  toast('New report started.', 'info');
}

function syncMetaToForm() {
  const map = { metaDistrict:'district', metaBlock:'block', metaCluster:'cluster', metaSchool:'school', metaYear:'year' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = APP.meta[key] || '';
  });
  ['metaClass','metaSubject','metaExam','metaLang'].forEach(id => {
    const key = id.replace('meta','').toLowerCase();
    const el = document.getElementById(id);
    if (el) el.value = APP.meta[key] || '';
  });
}

function updateSessionStatus() {
  const el = document.getElementById('sessionStatus');
  if (!el) return;
  if (APP.configured) {
    el.className = 'badge badge-success';
    el.textContent = `✓ Class ${APP.meta.class} – ${APP.meta.subject}`;
  } else {
    el.className = 'badge badge-warning';
    el.textContent = 'Not Configured';
  }
}

window.updateDashboardStats = function() {
  const row = document.getElementById('dashboardStats');
  if (!row) return;
  if (!APP.blueprint.length && !APP.students.length) { row.style.display = 'none'; return; }
  row.style.display = 'grid';
  document.getElementById('statItems').textContent    = APP.blueprint.length;
  document.getElementById('statStudents').textContent = APP.students.length;
  document.getElementById('statTotalMarks').textContent = APP.blueprint.reduce((s,i) => s + Number(i.marks||0), 0);
  const los = [...new Set(APP.blueprint.map(i => i.loCode).filter(Boolean))];
  document.getElementById('statLoCodes').textContent  = los.length;
  const res = window.calcResults?.();
  if (res?.loPct) {
    const vals = Object.values(res.loPct).filter(v => !isNaN(v));
    document.getElementById('statAvgPct').textContent = vals.length
      ? (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1) + '%' : '—';
  }
};

/* ── SAVE ALL DATA (called from marks save button) ── */
window.saveAllData = async function() {
  if (!APP.currentEntryId) {
    toast('Save configuration first.', 'warning'); return;
  }
  try {
    await API.patch('school_entries', APP.currentEntryId, {
      items:    JSON.stringify(APP.blueprint),
      students: JSON.stringify({ students: APP.students, marks: APP.marks }),
      total_students: APP.students.length,
      total_marks_possible: APP.blueprint.reduce((s,i) => s + Number(i.marks||0), 0)
    });
    updateDashboardStats();
    toast('All data saved!');
  } catch(e) {
    toast('Save failed: ' + e.message, 'error');
  }
};

/* ── LOAD SAVED REPORTS ── */
async function loadSavedReports() {
  const list = document.getElementById('savedReportsList');
  if (!list) return;
  list.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading…</div>';
  try {
    const data = await API.get('school_entries');
    const rows = (data.data || []).sort((a,b) => (b.updated_at||0) - (a.updated_at||0));
    if (!rows.length) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No saved reports yet.</p></div>';
      return;
    }
    list.innerHTML = '';
    rows.forEach(r => {
      const items   = tryJ(r.items) || [];
      const sd      = tryJ(r.students) || { students: [] };
      const stuCnt  = sd.students?.length || 0;
      const div = document.createElement('div');
      div.className = 'report-item';
      div.innerHTML = `
        <div class="report-item-info">
          <div class="report-item-title">${esc(r.school||'(No School)')} &nbsp;·&nbsp; Class ${esc(r.class||'?')} – ${esc(r.subject||'?')}</div>
          <div class="report-item-meta">${esc(r.exam||'')} ${esc(r.year||'')} &nbsp;|&nbsp; ${esc(r.block||'—')} / ${esc(r.cluster||'—')} &nbsp;|&nbsp; ${items.length} questions, ${stuCnt} students</div>
        </div>
        <div class="report-item-actions">
          <button class="btn btn-sm btn-primary" onclick="window.loadReport('${r.id}')"><i class="fas fa-folder-open"></i> Load</button>
          <button class="btn btn-sm btn-danger-outline" onclick="window.deleteReport('${r.id}')"><i class="fas fa-trash"></i></button>
        </div>`;
      list.appendChild(div);
    });
  } catch(e) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load reports.</p></div>';
  }
}

window.loadReport = async function(id) {
  try {
    const r = await API.getOne('school_entries', id);
    APP.currentEntryId = r.id;
    APP.meta = {
      district: r.district||'GANJAM', block: r.block||'', cluster: r.cluster||'',
      school: r.school||'', class: r.class||'IV', subject: r.subject||'Mathematics',
      exam: r.exam||'SA-II', year: r.year||'2025-26', lang: r.lang||'en'
    };
    APP.blueprint = tryJ(r.items) || [];
    const sd = tryJ(r.students) || {};
    APP.students = sd.students || [];
    APP.marks    = sd.marks || {};
    APP.configured = true;
    syncMetaToForm();
    updateSessionStatus();
    updateDashboardStats();
    window.renderBlueprintTable?.();
    window.renderStudentTable?.();
    toast(`Loaded: Class ${r.class} – ${r.subject} (${r.school||''})`);
  } catch(e) {
    toast('Failed to load: ' + e.message, 'error');
  }
};

window.deleteReport = async function(id) {
  if (!confirm('Permanently delete this report?')) return;
  try {
    await API.remove('school_entries', id);
    if (APP.currentEntryId === id) {
      APP.currentEntryId = null; APP.configured = false;
      APP.blueprint = []; APP.students = []; APP.marks = {};
      updateSessionStatus(); updateDashboardStats();
    }
    loadSavedReports();
    toast('Deleted.', 'info');
  } catch(e) { toast('Delete failed.', 'error'); }
};

/* ── CALCULATIONS ── */
window.calcResults = function() {
  const bp  = APP.blueprint;
  const stu = APP.students;
  if (!bp.length || !stu.length) return null;

  const studentTotals  = {};
  const itemColTotal   = {};  // { itemId: sum across students }
  const loObtained     = {};  // { loCode: total obtained across all students }
  const loAllottedPer  = {};  // { loCode: marks per student }
  const loPct          = {};  // { loCode: percentage }
  const itemLoPct      = {};  // { itemId: percentage (item-level) }

  // Initialize
  bp.forEach(item => { itemColTotal[item.id] = 0; });
  stu.forEach(s   => { studentTotals[s.id] = 0; });

  // Group items by LO
  const loItems = {};
  bp.forEach(item => {
    const lo = item.loCode || '(No LO)';
    if (!loItems[lo]) loItems[lo] = [];
    loItems[lo].push(item);
  });
  Object.entries(loItems).forEach(([lo, items]) => {
    loAllottedPer[lo] = items.reduce((s,i) => s + Number(i.marks||0), 0);
    loObtained[lo] = 0;
  });

  // Accumulate marks
  stu.forEach(s => {
    bp.forEach(item => {
      const v = APP.marks[s.id]?.[item.id];
      if (v !== undefined && v !== '' && v !== 'A') {
        const num = Number(v) || 0;
        studentTotals[s.id]   += num;
        itemColTotal[item.id] += num;
        const lo = item.loCode || '(No LO)';
        loObtained[lo] = (loObtained[lo] || 0) + num;
      }
    });
  });

  // LO-wise percentages
  const totalStudents = stu.length;
  Object.entries(loObtained).forEach(([lo, obtained]) => {
    const maxPossible = (loAllottedPer[lo] || 0) * totalStudents;
    loPct[lo] = maxPossible > 0 ? (obtained / maxPossible) * 100 : 0;
  });

  // Item-level percentages (contribution per question across all students)
  bp.forEach(item => {
    const lo = item.loCode || '(No LO)';
    const maxPossible = Number(item.marks||0) * totalStudents;
    itemLoPct[item.id] = maxPossible > 0
      ? ((itemColTotal[item.id] / maxPossible) * 100).toFixed(1)
      : '—';
  });

  return { studentTotals, itemColTotal, loObtained, loAllottedPer, loPct, itemLoPct };
};

/* ── LOAD LO MASTER ── */
async function loadLoMaster() {
  try {
    const data = await API.get('lo_codes');
    APP.loMaster = data.data || [];
    window.renderLOMaster?.();
    window.buildLoDatalist?.();
  } catch(e) {
    console.warn('Failed to load LO codes:', e.message);
  }
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initDashboard();
  await loadLoMaster();
  loadSavedReports();
  updateSessionStatus();
  updateDashboardStats();
});
