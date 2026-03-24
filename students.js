/* ══════════════════════════════════════════════════════════════
   students.js  –  Student roster management
   Supports English and Odia student names
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ══ RENDER STUDENT TABLE ══ */
window.renderStudentTable = function() {
  const tbody = document.getElementById('studentBody');
  if (!tbody) return;

  if (!APP.students.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-row">No students added yet. Click <b>Add Student</b> or use <b>Bulk Import</b>.</td></tr>`;
  } else {
    tbody.innerHTML = APP.students.map((s, idx) => `
      <tr>
        <td class="td-sl">${idx+1}</td>
        <td>${esc(s.roll)}</td>
        <td class="odia-input">${esc(s.name)}</td>
        <td><button class="icon-btn del-btn" onclick="deleteStudent('${s.id}')"><i class="fas fa-trash"></i></button></td>
      </tr>`).join('');
  }

  const countEl = document.getElementById('stuCountText');
  if (countEl) countEl.textContent = `${APP.students.length} student${APP.students.length!==1?'s':''}`;
  updateDashboardStats();
};

/* ── ADD SINGLE STUDENT ── */
function addSingleStudent() {
  const rollEl = document.getElementById('stuRoll');
  const nameEl = document.getElementById('stuName');
  const roll = rollEl?.value.trim() || '';
  const name = nameEl?.value.trim() || '';
  if (!name) { toast('Student name is required.', 'warning'); return; }

  // Auto-assign roll if not given
  const autoRoll = roll || String(APP.students.length + 1);

  APP.students.push({ id: genId(), roll: autoRoll, name });
  if (rollEl) rollEl.value = '';
  if (nameEl) nameEl.value = '';
  nameEl?.focus();
  renderStudentTable();
  toast(`Added: ${name}`);
}

/* ── DELETE STUDENT ── */
window.deleteStudent = function(id) {
  APP.students = APP.students.filter(s => s.id !== id);
  if (APP.marks[id]) delete APP.marks[id];
  renderStudentTable();
};

/* ── IMPORT BULK STUDENTS ── */
function importBulkStudents() {
  const text = document.getElementById('bulkStuArea')?.value || '';
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (!lines.length) { toast('No data to import.', 'warning'); return; }

  const imported = [];
  let autoNum = APP.students.length + 1;

  lines.forEach(line => {
    // Support: "Roll,Name" or "Name" only
    const parts = line.includes(',') ? line.split(',') : line.includes('\t') ? line.split('\t') : [line];
    let roll, name;
    if (parts.length >= 2) {
      roll = parts[0].trim();
      name = parts.slice(1).join(',').trim();
    } else {
      roll = String(autoNum);
      name = parts[0].trim();
    }
    if (!name) return;
    if (!roll) roll = String(autoNum);
    imported.push({ id: genId(), roll, name });
    autoNum++;
  });

  if (!imported.length) { toast('No valid students found.', 'warning'); return; }

  if (APP.students.length && !confirm(`Append ${imported.length} students to existing ${APP.students.length}? (Cancel = Replace)`)) {
    APP.students = imported;
  } else {
    APP.students.push(...imported);
  }

  renderStudentTable();
  document.getElementById('bulkStudentPanel').style.display = 'none';
  const areaEl = document.getElementById('bulkStuArea');
  if (areaEl) areaEl.value = '';
  toast(`Imported ${imported.length} students!`);
}

/* ── SAMPLE STUDENTS ── */
function loadSampleStudents() {
  if (!confirm('Load 10 sample students? This will replace current roster.')) return;
  APP.students = [
    {id:genId(),roll:'1',  name:'Ram Prasad Nayak'},
    {id:genId(),roll:'2',  name:'Sita Devi Panda'},
    {id:genId(),roll:'3',  name:'Arjun Kumar Sahu'},
    {id:genId(),roll:'4',  name:'Priya Mohapatra'},
    {id:genId(),roll:'5',  name:'Suresh Behera'},
    {id:genId(),roll:'6',  name:'Gita Rani Das'},
    {id:genId(),roll:'7',  name:'Bikash Mishra'},
    {id:genId(),roll:'8',  name:'Anita Biswal'},
    {id:genId(),roll:'9',  name:'Pramod Sethi'},
    {id:genId(),roll:'10', name:'Kavita Swain'}
  ];
  APP.marks = {};
  renderStudentTable();
  toast('Sample roster of 10 students loaded!');
}

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnAddStudent')?.addEventListener('click', () => {
    const form = document.getElementById('singleStudentForm');
    const bulk = document.getElementById('bulkStudentPanel');
    if (bulk) bulk.style.display = 'none';
    if (form) form.style.display = form.style.display==='none' ? '' : 'none';
    if (form?.style.display !== 'none') document.getElementById('stuRoll')?.focus();
  });

  document.getElementById('btnConfirmAddStu')?.addEventListener('click', addSingleStudent);

  document.getElementById('stuName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addSingleStudent();
  });

  document.getElementById('btnBulkStudents')?.addEventListener('click', () => {
    const form = document.getElementById('singleStudentForm');
    const bulk = document.getElementById('bulkStudentPanel');
    if (form) form.style.display = 'none';
    if (bulk) bulk.style.display = bulk.style.display==='none' ? '' : 'none';
    if (bulk?.style.display !== 'none') document.getElementById('bulkStuArea')?.focus();
  });

  document.getElementById('btnImportStudents')?.addEventListener('click', importBulkStudents);

  document.getElementById('btnSampleStudents')?.addEventListener('click', loadSampleStudents);

  document.getElementById('btnClearStudents')?.addEventListener('click', () => {
    if (!APP.students.length || confirm('Remove all students?')) {
      APP.students = []; APP.marks = {};
      renderStudentTable();
      toast('Students cleared.', 'info');
    }
  });

  renderStudentTable();
});
