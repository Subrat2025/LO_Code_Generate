/* ══════════════════════════════════════════════════════════════
   blueprint.js  –  Blueprint builder
   • Manual LO code entry (free text + datalist autocomplete)
   • Odia question label support
   • Bulk upload from Excel/CSV file
   • Paste CSV text
   • Shared library: save/load blueprints from backend
   Tables: lo_codes, bp_library
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ── LOCAL LABEL FORMATTING (Odia ↔ English) ──
   Defined here so it is available before marks.js loads */
(function() {
  if (typeof window.formatLabel === 'function') return; // already defined
  const DIG = {'୦':'0','୧':'1','୨':'2','୩':'3','୪':'4','୫':'5','୬':'6','୭':'7','୮':'8','୯':'9'};
  const VOW = {'କ':'a','ଖ':'b','ଗ':'c','ଘ':'d','ଙ':'e','ଚ':'f','ଛ':'g','ଜ':'h','ଝ':'i','ଞ':'j',
               'ଟ':'k','ଠ':'l','ଡ':'m','ଢ':'n','ଣ':'o','ତ':'p','ଥ':'q','ଦ':'r','ଧ':'s','ନ':'t',
               'ପ':'u','ଫ':'v','ବ':'w','ଭ':'x','ମ':'y','ଯ':'z'};
  function _odiaToEn(label) {
    if (!label) return '';
    let out = '';
    for (const ch of label) out += DIG[ch] || VOW[ch] || ch;
    return out;
  }
  window.formatLabel = function(label) {
    if (!label) return '';
    if (/[\u0B00-\u0B7F]/.test(label)) {
      const en = _odiaToEn(label);
      return en !== label ? `${label}(${en})` : label;
    }
    return label;
  };
})();

/* ── SAMPLE BLUEPRINT (Class IV Mathematics) ── */
const SAMPLE_BP = [
  {qLabel:'1(a)', section:'Written', loCode:'M412', marks:2},
  {qLabel:'1(b)', section:'Written', loCode:'M409', marks:2},
  {qLabel:'1(c)', section:'Written', loCode:'M403', marks:2},
  {qLabel:'1(d)', section:'Written', loCode:'M401', marks:2},
  {qLabel:'1(e)', section:'Written', loCode:'M409', marks:2},
  {qLabel:'1(f)', section:'Written', loCode:'M401', marks:2},
  {qLabel:'1(g)', section:'Written', loCode:'M401', marks:2},
  {qLabel:'1(h)', section:'Written', loCode:'M412', marks:2},
  {qLabel:'1(i)', section:'Written', loCode:'M401', marks:2},
  {qLabel:'1(j)', section:'Written', loCode:'M416', marks:2},
  {qLabel:'1(k)', section:'Written', loCode:'M421', marks:2},
  {qLabel:'1(l)', section:'Written', loCode:'M409', marks:2},
  {qLabel:'1(m)',section:'Written', loCode:'M403', marks:2},
  {qLabel:'1(n)', section:'Written', loCode:'M413', marks:2},
  {qLabel:'1(o)', section:'Written', loCode:'M406', marks:2},
  {qLabel:'1(p)', section:'Written', loCode:'M415', marks:2},
  {qLabel:'2(a)', section:'Written', loCode:'M401', marks:1},
  {qLabel:'2(b)', section:'Written', loCode:'M412', marks:1},
  {qLabel:'2(c)', section:'Written', loCode:'M418', marks:1},
  {qLabel:'2(d)', section:'Written', loCode:'M401', marks:1},
  {qLabel:'2(e)', section:'Written', loCode:'M406', marks:1},
  {qLabel:'2(f)', section:'Written', loCode:'M406', marks:1},
  {qLabel:'2(g)', section:'Written', loCode:'M414', marks:1},
  {qLabel:'2(h)', section:'Written', loCode:'M418', marks:1},
  {qLabel:'9',    section:'Written', loCode:'M403', marks:4},
  {qLabel:'10',   section:'Written', loCode:'M421', marks:4},
  {qLabel:'1',    section:'Oral',    loCode:'M402', marks:2},
  {qLabel:'2',    section:'Oral',    loCode:'M412', marks:2},
  {qLabel:'3',    section:'Oral',    loCode:'M412', marks:2},
  {qLabel:'4',    section:'Oral',    loCode:'M404', marks:2},
  {qLabel:'5',    section:'Oral',    loCode:'M412', marks:2},
  {qLabel:'6',    section:'Oral',    loCode:'M406', marks:2},
  {qLabel:'7',    section:'Oral',    loCode:'M403', marks:2},
  {qLabel:'8',    section:'Oral',    loCode:'M413', marks:2},
  {qLabel:'9',    section:'Oral',    loCode:'M416', marks:2},
  {qLabel:'10',   section:'Oral',    loCode:'M412', marks:2}
];

/* ── BUILD DATALIST FOR LO AUTOCOMPLETE ── */
window.buildLoDatalist = function() {
  let dl = document.getElementById('loDatalist');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'loDatalist'; document.body.appendChild(dl); }
  dl.innerHTML = APP.loMaster.map(l =>
    `<option value="${esc(l.lo_code)}">${esc(l.lo_code)} – ${esc(l.lo_description||'')}</option>`
  ).join('');
};

/* ══ RENDER BLUEPRINT TABLE ══ */
window.renderBlueprintTable = function() {
  buildLoDatalist();
  const tbody = document.getElementById('blueprintBody');
  if (!tbody) return;

  if (!APP.blueprint.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">
      No items yet. Click <b>Add Row</b>, use <b>Bulk Upload</b>, <b>Paste CSV</b>, or load from the <b>Shared Library</b>.
    </td></tr>`;
    /* Hide preview table when blueprint is empty */
    const previewCard = document.getElementById('bpPreviewCard');
    if (previewCard) previewCard.style.display = 'none';
  } else {
    tbody.innerHTML = APP.blueprint.map((item, idx) => buildBpRow(item, idx)).join('');
    /* Auto-generate and show the full manual entry table whenever blueprint has items */
    renderBpPreviewTable();
  }
  updateBpSummary();
};

/* ══════════════════════════════════════════════════════════════
   BLUEPRINT FULL TABLE PREVIEW
   Renders a complete "Format-A style" manual-entry reference table
   showing all items grouped by Written then Oral, with:
     Row-0  : Section banners  (WRITTEN | ORAL)
     Row-1  : LO Codes         (one cell per question, no colspan)
     Row-2  : Q. Serial No.    (1-n within section)
     Row-3  : Q. Label         (original label)
     Row-4  : Section tag      (W / O / Both)
     Row-5  : Allotted Marks
   Plus a summary footer row.
   ══════════════════════════════════════════════════════════════ */
window.renderBpPreviewTable = function() {
  const card    = document.getElementById('bpPreviewCard');
  const thead   = document.getElementById('bpPreviewHead');
  const tbody   = document.getElementById('bpPreviewBody');
  const summEl  = document.getElementById('bpPreviewSummary');
  if (!card || !thead || !tbody) return;

  const bp = APP.blueprint;
  if (!bp.length) {
    card.style.display = 'none';
    return;
  }

  card.style.display = '';

  const wItems = bp.filter(i => i.section !== 'Oral');
  const oItems = bp.filter(i => i.section === 'Oral');
  const totalMarks = bp.reduce((s, i) => s + Number(i.marks || 0), 0);
  const wMarks     = wItems.reduce((s, i) => s + Number(i.marks || 0), 0);
  const oMarks     = oItems.reduce((s, i) => s + Number(i.marks || 0), 0);
  const uniqueLOs  = [...new Set(bp.map(i => i.loCode).filter(Boolean))];

  /* Update summary badge */
  if (summEl) {
    summEl.innerHTML =
      `<strong>${bp.length}</strong> questions &nbsp;|&nbsp;
       ✍ Written: <strong>${wItems.length}</strong> (${wMarks} marks) &nbsp;|&nbsp;
       🗣 Oral: <strong>${oItems.length}</strong> (${oMarks} marks) &nbsp;|&nbsp;
       Total: <strong>${totalMarks}</strong> marks &nbsp;|&nbsp;
       <strong>${uniqueLOs.length}</strong> LO codes`;
  }

  const nW = wItems.length;
  const nO = oItems.length;
  const totalCols = 2 + nW + nO + 1; /* Sl + Name + W cols + O cols + Total */

  /* ── HEADER ── */
  let hHtml = '';

  /* Row 0 – Section banners */
  hHtml += `<tr class="bpp-row-banner">
    <th class="bpp-corner" rowspan="6">Sl.<br>No.</th>
    <th class="bpp-corner-name" rowspan="6">Question<br>Label</th>`;
  if (nW) hHtml += `<th class="bpp-banner bpp-banner-w" colspan="${nW}">✍ WRITTEN QUESTIONS (Q.1 – ${nW})</th>`;
  if (nO) hHtml += `<th class="bpp-banner bpp-banner-o" colspan="${nO}">🗣 ORAL QUESTIONS (Q.1 – ${nO})</th>`;
  hHtml += `<th class="bpp-corner-total" rowspan="6">Total<br>Marks<br><small>(${totalMarks})</small></th></tr>`;

  /* Row 1 – LO Codes (one per question column) */
  hHtml += `<tr class="bpp-row-lo">`;
  wItems.forEach(item => {
    const lo = item.loCode || '—';
    hHtml += `<th class="bpp-lo bpp-lo-w" title="${esc(item.loCode||'')}">${esc(lo)}</th>`;
  });
  oItems.forEach(item => {
    const lo = item.loCode || '—';
    hHtml += `<th class="bpp-lo bpp-lo-o" title="${esc(item.loCode||'')}">${esc(lo)}</th>`;
  });
  hHtml += `</tr>`;

  /* Row 2 – Q. Serial No. */
  hHtml += `<tr class="bpp-row-serial">`;
  wItems.forEach((_, idx) => hHtml += `<th class="bpp-serial bpp-serial-w">${idx + 1}</th>`);
  oItems.forEach((_, idx) => hHtml += `<th class="bpp-serial bpp-serial-o">${idx + 1}</th>`);
  hHtml += `</tr>`;

  /* Row 3 – Q. Label */
  hHtml += `<tr class="bpp-row-label">`;
  wItems.forEach(item => {
    const lbl = formatLabel(item.qLabel || '');
    hHtml += `<th class="bpp-qlabel bpp-qlabel-w odia-input">${esc(lbl)}</th>`;
  });
  oItems.forEach(item => {
    const lbl = formatLabel(item.qLabel || '');
    hHtml += `<th class="bpp-qlabel bpp-qlabel-o odia-input">${esc(lbl)}</th>`;
  });
  hHtml += `</tr>`;

  /* Row 4 – Section tag */
  hHtml += `<tr class="bpp-row-sect">`;
  wItems.forEach(item => {
    const tag = item.section === 'Both' ? 'W+O' : 'W';
    hHtml += `<th class="bpp-sect bpp-sect-w">${tag}</th>`;
  });
  oItems.forEach(() => hHtml += `<th class="bpp-sect bpp-sect-o">O</th>`);
  hHtml += `</tr>`;

  /* Row 5 – Allotted Marks */
  hHtml += `<tr class="bpp-row-allot">`;
  wItems.forEach(item => hHtml += `<th class="bpp-allot bpp-allot-w">${item.marks}</th>`);
  oItems.forEach(item => hHtml += `<th class="bpp-allot bpp-allot-o">${item.marks}</th>`);
  hHtml += `</tr>`;

  thead.innerHTML = hHtml;

  /* ── BODY: one row per LO code (grouped, sorted low→high) ── */
  /* Group items by LO code, sorted */
  const loOrder = [];
  const loMap   = {};
  bp.forEach(item => {
    const lo = item.loCode || '(No LO)';
    if (!loMap[lo]) { loMap[lo] = { lo, wItems: [], oItems: [] }; loOrder.push(lo); }
    if (item.section === 'Oral') loMap[lo].oItems.push(item);
    else                          loMap[lo].wItems.push(item);
  });
  /* Sort LO codes low → high (reuse global sort from preview.js if loaded, else simple) */
  const sortedLoOrder = loOrder.slice().sort((a, b) => {
    const parse = s => { const m = String(s).match(/^([A-Za-z]*)(\d+)(.*)$/); return m ? { p: m[1].toUpperCase(), n: parseInt(m[2],10), s: m[3].toUpperCase() } : { p: s.toUpperCase(), n:0, s:'' }; };
    const pa = parse(a), pb = parse(b);
    if (pa.p !== pb.p) return pa.p < pb.p ? -1 : 1;
    if (pa.n !== pb.n) return pa.n - pb.n;
    return pa.s < pb.s ? -1 : pa.s > pb.s ? 1 : 0;
  });

  let bHtml = '';
  sortedLoOrder.forEach((lo, loIdx) => {
    const g = loMap[lo];
    const loInfo = APP.loMaster.find(l => l.lo_code === lo);
    const loDesc = loInfo ? (loInfo.lo_description || '') : '';
    const wLbls  = g.wItems.map(i => formatLabel(i.qLabel || ''));
    const oLbls  = g.oItems.map(i => formatLabel(i.qLabel || ''));
    const wMks   = g.wItems.map(i => Number(i.marks || 0));
    const oMks   = g.oItems.map(i => Number(i.marks || 0));
    const loTotal= [...wMks, ...oMks].reduce((s, v) => s + v, 0);

    /* Build the written mark cells – highlight which columns belong to this LO */
    let wCells = '', oCells = '';
    wItems.forEach(item => {
      const belongs = (item.loCode || '(No LO)') === lo;
      wCells += belongs
        ? `<td class="bpp-cell bpp-cell-w bpp-cell-active">${Number(item.marks)}</td>`
        : `<td class="bpp-cell bpp-cell-w bpp-cell-other">—</td>`;
    });
    oItems.forEach(item => {
      const belongs = (item.loCode || '(No LO)') === lo;
      oCells += belongs
        ? `<td class="bpp-cell bpp-cell-o bpp-cell-active">${Number(item.marks)}</td>`
        : `<td class="bpp-cell bpp-cell-o bpp-cell-other">—</td>`;
    });

    const wNos = g.wItems.map((item) => formatLabel(item.qLabel||'')).join(', ') || '—';
    const oNos = g.oItems.map((item) => formatLabel(item.qLabel||'')).join(', ') || '—';

    bHtml += `<tr class="bpp-lo-row${loIdx % 2 === 0 ? '' : ' bpp-alt'}">
      <td class="bpp-sl">${loIdx + 1}</td>
      <td class="bpp-name-cell">
        <span class="bpp-lo-code-badge">${esc(lo)}</span>
        ${loDesc ? `<span class="bpp-lo-desc">${esc(loDesc)}</span>` : ''}
        <span class="bpp-lo-qnos">W: ${esc(wNos)} &nbsp; O: ${esc(oNos)}</span>
      </td>
      ${wCells}${oCells}
      <td class="bpp-total-cell">${loTotal}</td>
    </tr>`;
  });

  /* Summary / totals row */
  bHtml += `<tr class="bpp-totals-row">
    <td colspan="2" class="bpp-totals-label">Allotted Marks per Question</td>`;
  wItems.forEach(item => bHtml += `<td class="bpp-totals-cell bpp-totals-w">${item.marks}</td>`);
  oItems.forEach(item => bHtml += `<td class="bpp-totals-cell bpp-totals-o">${item.marks}</td>`);
  bHtml += `<td class="bpp-totals-cell"><strong>${totalMarks}</strong></td></tr>`;

  /* Grand totals row */
  bHtml += `<tr class="bpp-grand-row">
    <td colspan="2" class="bpp-totals-label">Section Total Marks</td>`;
  if (nW) bHtml += `<td colspan="${nW}" class="bpp-grand-w">Written: <strong>${wMarks}</strong></td>`;
  if (nO) bHtml += `<td colspan="${nO}" class="bpp-grand-o">Oral: <strong>${oMarks}</strong></td>`;
  bHtml += `<td class="bpp-totals-cell"><strong>${totalMarks}</strong></td></tr>`;

  tbody.innerHTML = bHtml;
};

function buildBpRow(item, idx) {
  const loInfo = APP.loMaster.find(l => l.lo_code === item.loCode);
  const loHint = loInfo
    ? `<div class="lo-hint">${esc(loInfo.lo_description||'')}${loInfo.lo_description_odia ? ' / '+esc(loInfo.lo_description_odia) : ''}</div>`
    : '';
  return `<tr data-id="${item.id}">
    <td class="td-sl">${idx+1}</td>
    <td>
      <input type="text" class="odia-input qlabel-input"
        value="${esc(item.qLabel||'')}"
        placeholder="1(a) or ୧(କ)"
        onchange="bpUpdate('${item.id}','qLabel',this.value)"
        title="Question label (supports Odia numerals)" />
    </td>
    <td>
      <select class="sect-select" onchange="bpUpdate('${item.id}','section',this.value)">
        <option value="Written" ${item.section==='Written'?'selected':''}>Written</option>
        <option value="Oral"    ${item.section==='Oral'   ?'selected':''}>Oral</option>
        <option value="Both"    ${item.section==='Both'   ?'selected':''}>Both</option>
      </select>
    </td>
    <td>
      <input type="text" list="loDatalist"
        class="lo-code-input"
        value="${esc(item.loCode||'')}"
        placeholder="Type LO code or pick…"
        oninput="bpUpdateLO(this,'${item.id}')"
        onchange="bpUpdateLO(this,'${item.id}')"
        style="text-transform:uppercase;" />
      ${loHint}
    </td>
    <td>
      <input type="number" class="marks-input"
        min="0.5" max="20" step="0.5"
        value="${item.marks||1}"
        onchange="bpUpdate('${item.id}','marks',this.value)" />
    </td>
    <td>
      <button class="icon-btn del-btn" onclick="bpDelete('${item.id}')" title="Delete row">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  </tr>`;
}

window.bpUpdate = function(id, field, val) {
  const item = APP.blueprint.find(i => i.id === id);
  if (!item) return;
  item[field] = field === 'marks' ? (Number(val) || 1) : val;
  updateBpSummary();
};

window.bpUpdateLO = function(input, id) {
  const val = input.value.trim().toUpperCase();
  const item = APP.blueprint.find(i => i.id === id);
  if (!item) return;
  item.loCode = val;
  // Update hint
  const row = input.closest('tr');
  if (row) {
    let hint = row.querySelector('.lo-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'lo-hint';
      input.parentNode.appendChild(hint);
    }
    const info = APP.loMaster.find(l => l.lo_code === val);
    hint.textContent = info ? (info.lo_description||'') + (info.lo_description_odia ? ' / '+info.lo_description_odia : '') : '';
  }
  updateBpSummary();
};

window.bpDelete = function(id) {
  APP.blueprint = APP.blueprint.filter(i => i.id !== id);
  // Remove marks for this item
  APP.students.forEach(s => { if (APP.marks[s.id]) delete APP.marks[s.id][id]; });
  renderBlueprintTable();
};

function updateBpSummary() {
  const el = document.getElementById('bpSummaryText');
  if (!el) return;
  const total  = APP.blueprint.reduce((s,i) => s + Number(i.marks||0), 0);
  const wTotal = APP.blueprint.filter(i => i.section !== 'Oral').reduce((s,i) => s + Number(i.marks||0), 0);
  const oTotal = APP.blueprint.filter(i => i.section === 'Oral').reduce((s,i) => s + Number(i.marks||0), 0);
  const los    = [...new Set(APP.blueprint.map(i => i.loCode).filter(Boolean))];
  el.innerHTML = `<strong>${APP.blueprint.length}</strong> items &nbsp;|&nbsp;
    Written: <strong>${wTotal}</strong> &nbsp;|&nbsp;
    Oral: <strong>${oTotal}</strong> &nbsp;|&nbsp;
    Total: <strong>${total}</strong> marks &nbsp;|&nbsp;
    <strong>${los.length}</strong> LO codes`;
  updateDashboardStats();
}

/* ══ LO MASTER GRID ══ */
let loFilterMode = 'current'; // 'current' | 'all'

window.renderLOMaster = function() {
  const grid = document.getElementById('loMasterGrid');
  if (!grid) return;
  const filter = (document.getElementById('loSearchInput')?.value || '').toLowerCase();
  const subj   = APP.meta.subject || '';

  let los = APP.loMaster.filter(l => {
    const matchF = !filter
      || l.lo_code.toLowerCase().includes(filter)
      || (l.lo_description||'').toLowerCase().includes(filter)
      || (l.lo_description_odia||'').toLowerCase().includes(filter);
    const matchS = loFilterMode === 'all' || !subj || l.subject === subj;
    return matchF && matchS;
  });

  // Sort: current subject first
  los.sort((a,b) => {
    const aM = a.subject===subj ? 0 : 1;
    const bM = b.subject===subj ? 0 : 1;
    return aM - bM || a.lo_code.localeCompare(b.lo_code);
  });

  if (!los.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>No LO codes found. Add one above!</p></div>`;
    return;
  }

  grid.innerHTML = los.map(l => `
    <div class="lo-card" onclick="appendBpWithLO('${esc(l.lo_code)}')" title="Click to add to blueprint">
      <span class="lo-code-badge">${esc(l.lo_code)}</span>
      <div class="lo-card-body">
        <div class="lo-desc-en">${esc(l.lo_description||'')}</div>
        ${l.lo_description_odia ? `<div class="lo-desc-od odia-input">${esc(l.lo_description_odia)}</div>` : ''}
        <div class="lo-meta">${esc(l.subject)} · Class ${esc(l.class)}</div>
      </div>
    </div>`).join('');
};

window.appendBpWithLO = function(loCode) {
  APP.blueprint.push({ id: genId(), qLabel: '', section: 'Written', loCode, marks: 1 });
  renderBlueprintTable();
  toast(`Added row with LO: ${loCode}`, 'info');
};

/* ══ ADD NEW LO CODE ══ */
function initAddLO() {
  document.getElementById('btnAddNewLO')?.addEventListener('click', () => {
    const f = document.getElementById('addLOForm');
    if (!f) return;
    const isHidden = f.style.display === 'none';
    f.style.display = isHidden ? '' : 'none';
    if (isHidden) {
      document.getElementById('newLoSubject').value = APP.meta.subject || 'Mathematics';
      document.getElementById('newLoClass').value   = APP.meta.class   || 'IV';
      document.getElementById('newLoCode').value    = '';
      document.getElementById('newLoDesc').value    = '';
      document.getElementById('newLoDescOdia').value = '';
    }
  });

  document.getElementById('btnCancelAddLO')?.addEventListener('click', () => {
    document.getElementById('addLOForm').style.display = 'none';
  });

  document.getElementById('btnSaveNewLO')?.addEventListener('click', async () => {
    const code = document.getElementById('newLoCode').value.trim().toUpperCase();
    const desc = document.getElementById('newLoDesc').value.trim();
    const odia = document.getElementById('newLoDescOdia').value.trim();
    const subj = document.getElementById('newLoSubject').value;
    const cls  = document.getElementById('newLoClass').value;

    if (!code || !desc) { toast('LO Code and English Description are required.', 'warning'); return; }
    if (APP.loMaster.find(l => l.lo_code===code && l.subject===subj && l.class===cls)) {
      toast(`LO ${code} already exists for ${subj} Class ${cls}.`, 'warning'); return;
    }

    try {
      const r = await API.create('lo_codes', { lo_code: code, lo_description: desc, lo_description_odia: odia, subject: subj, class: cls });
      APP.loMaster.push(r);
      APP.loMaster.sort((a,b) => a.lo_code.localeCompare(b.lo_code));
      buildLoDatalist();
      renderLOMaster();
      document.getElementById('addLOForm').style.display = 'none';
      toast(`LO Code ${code} added successfully!`);
    } catch(e) {
      toast('Failed to save: ' + e.message, 'error');
    }
  });
}

/* ══ SHARED LIBRARY ══ */
window.loadBpLibrary = async function() {
  const container = document.getElementById('bpLibraryList');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading…</div>';

  const filterClass   = document.getElementById('libFilterClass')?.value   || '';
  const filterSubject = document.getElementById('libFilterSubject')?.value || '';

  try {
    const data = await API.get('bp_library');
    let rows = data.data || [];
    if (filterClass)   rows = rows.filter(r => r.class   === filterClass);
    if (filterSubject) rows = rows.filter(r => r.subject === filterSubject);
    rows.sort((a,b) => (b.updated_at||0) - (a.updated_at||0));

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-book-open"></i>
        <p>No shared blueprints yet for this filter. Save your blueprint to share it!</p></div>`;
      return;
    }

    container.innerHTML = rows.map(r => {
      const items = tryJ(r.items) || [];
      const los = [...new Set(items.map(i=>i.loCode).filter(Boolean))];
      return `<div class="lib-item">
        <div class="lib-item-info">
          <div class="lib-item-title">Class ${esc(r.class)} – ${esc(r.subject)}</div>
          <div class="lib-item-meta">${esc(r.exam||'')} ${esc(r.year||'')} &nbsp;·&nbsp; ${items.length} questions, ${los.length} LO codes &nbsp;·&nbsp; Shared by: ${esc(r.school||'Unknown')}</div>
        </div>
        <div class="lib-item-actions">
          <button class="btn btn-sm btn-primary" onclick="window.useLibraryBp('${r.id}')"><i class="fas fa-download"></i> Use</button>
          <button class="btn btn-sm btn-danger-outline" onclick="window.deleteLibraryBp('${r.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load library.</p></div>`;
  }
};

window.useLibraryBp = async function(id) {
  if (!confirm('This will replace your current blueprint. Continue?')) return;
  try {
    const r = await API.getOne('bp_library', id);
    const items = tryJ(r.items) || [];
    APP.blueprint = items.map(i => ({ ...i, id: genId() }));
    renderBlueprintTable();
    toast(`Loaded ${APP.blueprint.length} items from library!`);
  } catch(e) { toast('Failed to load: '+e.message, 'error'); }
};

window.deleteLibraryBp = async function(id) {
  if (!confirm('Delete this shared blueprint?')) return;
  try {
    await API.remove('bp_library', id);
    loadBpLibrary();
    toast('Deleted from library.', 'info');
  } catch(e) { toast('Delete failed.', 'error'); }
};

/* ══ SAVE TO LIBRARY ══ */
async function saveBpToLibrary() {
  if (!APP.blueprint.length) { toast('Blueprint is empty.', 'warning'); return; }
  if (!APP.meta.class || !APP.meta.subject) { toast('Configure class & subject first.', 'warning'); return; }

  // Check for existing with same class/subject/school/exam/year
  try {
    const data = await API.get('bp_library');
    const existing = (data.data||[]).find(r =>
      r.class===APP.meta.class && r.subject===APP.meta.subject &&
      r.school===APP.meta.school && r.exam===APP.meta.exam && r.year===APP.meta.year
    );

    if (existing) {
      if (!confirm(`A blueprint for ${APP.meta.class}-${APP.meta.subject} by ${APP.meta.school||'this school'} already exists. Update it?`)) return;
      await API.patch('bp_library', existing.id, {
        items: JSON.stringify(APP.blueprint.map(i => ({qLabel:i.qLabel,section:i.section,loCode:i.loCode,marks:i.marks})))
      });
      toast('Blueprint updated in shared library!');
    } else {
      await API.create('bp_library', {
        class: APP.meta.class, subject: APP.meta.subject,
        school: APP.meta.school, exam: APP.meta.exam, year: APP.meta.year,
        items: JSON.stringify(APP.blueprint.map(i => ({qLabel:i.qLabel,section:i.section,loCode:i.loCode,marks:i.marks})))
      });
      toast('Blueprint saved to shared library!');
    }
    loadBpLibrary();
  } catch(e) {
    toast('Save failed: '+e.message, 'error');
  }
}

/* ══ BULK UPLOAD ══ */
function initBulkUpload() {
  const dropZone   = document.getElementById('bpDropZone');
  const fileInput  = document.getElementById('bpFileInput');

  dropZone?.addEventListener('click', () => fileInput?.click());
  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) parseUploadedFile(file);
  });
  fileInput?.addEventListener('change', () => {
    if (fileInput.files[0]) parseUploadedFile(fileInput.files[0]);
    fileInput.value = '';
  });

  document.getElementById('btnBpBulk')?.addEventListener('click', () => {
    const p = document.getElementById('bulkUploadPanel');
    const c = document.getElementById('pasteCsvPanel');
    if (c) c.style.display = 'none';
    if (p) p.style.display = p.style.display==='none' ? '' : 'none';
  });

  document.getElementById('btnBpPaste')?.addEventListener('click', () => {
    const p = document.getElementById('bulkUploadPanel');
    const c = document.getElementById('pasteCsvPanel');
    if (p) p.style.display = 'none';
    if (c) c.style.display = c.style.display==='none' ? '' : 'none';
  });

  document.getElementById('btnParseCsv')?.addEventListener('click', () => {
    const text = document.getElementById('pasteCsvArea')?.value || '';
    const items = parseCsvText(text);
    if (!items.length) { toast('No valid rows found.', 'warning'); return; }
    if (!confirm(`Import ${items.length} items? This will ${APP.blueprint.length?'append to':'replace'} current blueprint.`)) return;
    if (APP.blueprint.length && confirm('Append to existing blueprint? (Cancel to replace)')) {
      APP.blueprint.push(...items);
    } else {
      APP.blueprint = items;
    }
    renderBlueprintTable();
    document.getElementById('pasteCsvPanel').style.display = 'none';
    toast(`Imported ${items.length} items!`);
  });

  // Template downloads
  document.getElementById('btnDlTemplate')?.addEventListener('click', downloadExcelTemplate);
  document.getElementById('btnDlTemplateCsv')?.addEventListener('click', downloadCsvTemplate);
}

function parseUploadedFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv' || ext === 'txt') {
    const reader = new FileReader();
    reader.onload = e => {
      const items = parseCsvText(e.target.result);
      applyUploadedItems(items, file.name);
    };
    reader.readAsText(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb  = XLSX.read(e.target.result, {type:'array'});
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, {defval:''});
        const items = parseExcelRows(raw);
        applyUploadedItems(items, file.name);
      } catch(err) {
        toast('Failed to parse Excel: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    toast('Unsupported file type. Use .xlsx or .csv', 'warning');
  }
}

function parseCsvText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const items = [];
  for (const line of lines) {
    // Support comma or tab separated
    const parts = line.includes('\t') ? line.split('\t') : line.split(',');
    if (parts.length < 2) continue;
    // Detect header row
    if (parts[0].toLowerCase().includes('label') || parts[0].toLowerCase().includes('q_')) continue;
    const [qLabel='', section='Written', loCode='', marks='1'] = parts.map(p => p.trim().replace(/^["']|["']$/g,''));
    if (!qLabel) continue;
    items.push({
      id: genId(),
      qLabel,
      section: ['Written','Oral','Both'].includes(section) ? section : 'Written',
      loCode: loCode.toUpperCase(),
      marks: Number(marks) || 1
    });
  }
  return items;
}

function parseExcelRows(rows) {
  return rows.map(row => {
    // Flexible header matching
    const qLabel  = row['Q_Label'] || row['Question Label'] || row['Q Label'] || row['qLabel'] || row['Question'] || '';
    const section = row['Section'] || row['section'] || 'Written';
    const loCode  = (row['LO_Code'] || row['LO Code'] || row['loCode'] || row['LO'] || '').toString().trim().toUpperCase();
    const marks   = Number(row['Marks'] || row['marks'] || row['Mark'] || 1) || 1;
    if (!qLabel) return null;
    return { id: genId(), qLabel: String(qLabel).trim(), section: ['Written','Oral','Both'].includes(section)?section:'Written', loCode, marks };
  }).filter(Boolean);
}

function applyUploadedItems(items, filename) {
  if (!items.length) { toast('No valid data found in file.', 'warning'); return; }
  if (!confirm(`Found ${items.length} items in ${filename}.\nAppend to current blueprint? (Cancel = Replace)`)) {
    APP.blueprint = items;
  } else {
    if (APP.blueprint.length && confirm(`Append ${items.length} items to existing ${APP.blueprint.length} items?`)) {
      APP.blueprint.push(...items);
    } else {
      APP.blueprint = items;
    }
  }
  renderBlueprintTable();
  document.getElementById('bulkUploadPanel').style.display = 'none';
  toast(`Imported ${items.length} items from file!`);
}

function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Q_Label', 'Section', 'LO_Code', 'Marks'],
    ['1(a)', 'Written', 'M401', 2],
    ['1(b)', 'Written', 'M412', 2],
    ['1', 'Oral', 'M402', 2],
    ['# Add more rows below...', '', '', ''],
  ]);
  ws['!cols'] = [{wch:18},{wch:12},{wch:12},{wch:8}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Blueprint');
  XLSX.writeFile(wb, 'LO_Blueprint_Template.xlsx');
}

function downloadCsvTemplate() {
  const csv = '# Q_Label,Section,LO_Code,Marks\n1(a),Written,M401,2\n1(b),Written,M412,2\n1,Oral,M402,2\n';
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'LO_Blueprint_Template.csv';
  a.click();
}

/* ══ GENERATE FORMAT EXCEL — LO Codes Reference Workbook ══
   Creates a downloadable Excel with 3 sheets:
   1. "LO Codes" – full master list of all LO codes in the system
   2. "Current Blueprint" – the blueprint mapped to LO codes for this session
   3. "Q-LO Map" – quick reference: Q#, Label, Section, LO Code, Marks
   Useful for teachers to share or reference LO mappings offline.
═══════════════════════════════════════════════════════════════ */
function exportLOFormatExcel() {
  if (!APP.loMaster.length) {
    toast('LO codes not loaded yet. Please wait and try again.', 'warning');
    return;
  }

  const meta     = APP.meta;
  const bp       = APP.blueprint;
  const wb       = XLSX.utils.book_new();

  /* ── Helper: cell style helper (for column widths) ── */
  const colW = (...widths) => widths.map(w => ({wch: w}));

  /* ══ Sheet 1: Full LO Codes Master ══ */
  const lo1Header = ['Sl.', 'LO Code', 'Description (English)', 'Description (Odia)', 'Subject', 'Class'];

  /* Sort: subject → class → lo_code */
  const sortedLOs = [...APP.loMaster].sort((a, b) => {
    const sc = (a.subject||'').localeCompare(b.subject||'');
    if (sc !== 0) return sc;
    const cc = (a.class||'').localeCompare(b.class||'');
    if (cc !== 0) return cc;
    return (a.lo_code||'').localeCompare(b.lo_code||'');
  });

  const lo1Rows = sortedLOs.map((l, i) => [
    i + 1,
    l.lo_code || '',
    l.lo_description || '',
    l.lo_description_odia || '',
    l.subject || '',
    l.class || ''
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([
    [`LO CODES MASTER LIST`],
    [`Generated on: ${new Date().toLocaleDateString('en-IN')}  |  Total LO Codes: ${sortedLOs.length}`],
    [],
    lo1Header,
    ...lo1Rows
  ]);
  ws1['!cols'] = colW(5, 12, 55, 45, 16, 8);
  /* Bold the header row (row index 3, 0-based) */
  XLSX.utils.book_append_sheet(wb, ws1, 'LO Codes Master');

  /* ══ Sheet 2: Current Subject+Class LO Codes ══ */
  const subj = meta.subject || '';
  const cls  = meta.class   || '';
  const filteredLOs = sortedLOs.filter(l =>
    (!subj || l.subject === subj) && (!cls || l.class === cls)
  );

  const lo2Rows = filteredLOs.map((l, i) => [
    i + 1,
    l.lo_code || '',
    l.lo_description || '',
    l.lo_description_odia || '',
    l.subject || '',
    l.class || ''
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([
    [`LO CODES – Class ${cls} ${subj}`],
    [`Filtered for current session  |  Total: ${filteredLOs.length} LO codes`],
    [],
    lo1Header,
    ...lo2Rows
  ]);
  ws2['!cols'] = colW(5, 12, 55, 45, 16, 8);
  XLSX.utils.book_append_sheet(wb, ws2, `Class ${cls} ${subj}`.trim().slice(0, 31));

  /* ══ Sheet 3: Current Blueprint Q-LO Map ══ */
  const wItems = bp.filter(i => i.section !== 'Oral');
  const oItems = bp.filter(i => i.section === 'Oral');

  const bpHeader = ['Q Type', 'Q Serial', 'Q Label', 'Section', 'LO Code', 'LO Description', 'Marks'];
  const bpRows   = [];

  /* Written questions */
  wItems.forEach((item, idx) => {
    const loInfo = APP.loMaster.find(l => l.lo_code === item.loCode);
    bpRows.push([
      'Written',
      idx + 1,
      item.qLabel || '',
      item.section || 'Written',
      item.loCode  || '',
      loInfo ? (loInfo.lo_description || '') : '',
      Number(item.marks) || 0
    ]);
  });

  /* Oral questions */
  oItems.forEach((item, idx) => {
    const loInfo = APP.loMaster.find(l => l.lo_code === item.loCode);
    bpRows.push([
      'Oral',
      idx + 1,
      item.qLabel || '',
      'Oral',
      item.loCode  || '',
      loInfo ? (loInfo.lo_description || '') : '',
      Number(item.marks) || 0
    ]);
  });

  const totalMarks = bp.reduce((s, i) => s + (Number(i.marks) || 0), 0);
  const uniqueLOs  = [...new Set(bp.map(i => i.loCode).filter(Boolean))];

  const ws3 = XLSX.utils.aoa_to_sheet([
    [`BLUEPRINT – Q to LO MAPPING`],
    [`School: ${meta.school||'—'}  |  Class: ${cls}  |  Subject: ${subj}  |  Exam: ${meta.exam||''}  |  Year: ${meta.year||''}`],
    [`Total Questions: ${bp.length}  |  Written: ${wItems.length}  |  Oral: ${oItems.length}  |  Total Marks: ${totalMarks}  |  LO Codes Used: ${uniqueLOs.length}`],
    [],
    bpHeader,
    ...bpRows,
    [],
    ['', '', '', '', 'TOTAL MARKS', '', totalMarks]
  ]);
  ws3['!cols'] = colW(10, 10, 12, 12, 12, 55, 8);
  XLSX.utils.book_append_sheet(wb, ws3, 'Blueprint Q-LO Map');

  /* ══ Save ══ */
  const fname = `LO_Format_Class${cls}_${subj}_${meta.exam||''}_${meta.year||''}.xlsx`
    .replace(/\s+/g, '_').replace(/[^\w.\-]/g, '');
  XLSX.writeFile(wb, fname);
  toast(`✅ Format Excel downloaded: ${fname}`);
}

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
  // Add Row
  document.getElementById('btnBpAddRow')?.addEventListener('click', () => {
    APP.blueprint.push({ id: genId(), qLabel: '', section: 'Written', loCode: '', marks: 1 });
    renderBlueprintTable();
    // Focus last row's qLabel input
    setTimeout(() => {
      const inputs = document.querySelectorAll('#blueprintBody .qlabel-input');
      inputs[inputs.length-1]?.focus();
    }, 50);
  });

  // Clear All
  document.getElementById('btnClearBp')?.addEventListener('click', () => {
    if (!APP.blueprint.length || confirm('Clear all blueprint items?')) {
      APP.blueprint = []; APP.marks = {};
      renderBlueprintTable();
      toast('Blueprint cleared.', 'info');
    }
  });

  // Load Sample
  document.getElementById('btnLoadSample')?.addEventListener('click', () => {
    if (!confirm('Load sample Class IV Mathematics blueprint? This will replace current items.')) return;
    APP.meta.class   = 'IV';
    APP.meta.subject = 'Mathematics';
    const clsEl = document.getElementById('metaClass');
    const subEl = document.getElementById('metaSubject');
    if (clsEl) clsEl.value = 'IV';
    if (subEl) subEl.value = 'Mathematics';
    APP.blueprint = SAMPLE_BP.map(i => ({...i, id: genId()}));
    renderBlueprintTable();
    toast('Sample Class IV Mathematics blueprint loaded!');
  });

  // Print full blueprint entry table
  document.getElementById('btnPrintBpTable')?.addEventListener('click', () => {
    const head = document.getElementById('bpPreviewHead')?.innerHTML || '';
    const body = document.getElementById('bpPreviewBody')?.innerHTML || '';
    const meta = APP.meta;
    const win  = window.open('', '_blank', 'width=1200,height=800');
    if (!win) { toast('Pop-up blocked!', 'error'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Blueprint Entry Table – ${meta.school || 'Report'}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Oriya:wght@400;700&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:Calibri,Arial,sans-serif;font-size:8pt;padding:8mm;}
        h2{font-size:11pt;text-align:center;margin-bottom:4px;}
        .meta{font-size:8pt;text-align:center;margin-bottom:8px;color:#444;}
        table{width:100%;border-collapse:collapse;table-layout:fixed;}
        th,td{border:1px solid #000;padding:2px 3px;vertical-align:middle;text-align:center;word-wrap:break-word;white-space:normal;}
        .bpp-corner,.bpp-corner-name,.bpp-corner-total{font-weight:bold;font-size:7.5pt;}
        .bpp-banner{font-size:8pt;font-weight:bold;background:#f0f4f8;}
        .bpp-banner-w{background:#e0f2fe;}
        .bpp-banner-o{background:#fef9c3;}
        .bpp-lo{font-size:7pt;font-weight:bold;}
        .bpp-lo-w{color:#1e40af;}
        .bpp-lo-o{color:#92400e;}
        .bpp-serial{font-size:7pt;}
        .bpp-qlabel{font-size:7pt;}
        .bpp-sect{font-size:6.5pt;}
        .bpp-allot{font-size:7.5pt;font-weight:bold;}
        .bpp-sl{text-align:center;font-size:7pt;}
        .bpp-name-cell{text-align:left;padding-left:4px;font-size:7pt;font-weight:bold;}
        .bpp-lo-code-badge{font-weight:bold;font-size:8pt;display:block;}
        .bpp-lo-qnos{font-size:6pt;color:#555;display:block;}
        .bpp-lo-desc{font-size:6pt;color:#64748b;display:block;}
        .bpp-cell-active{font-weight:bold;}
        .bpp-cell-other{color:#bbb;}
        .bpp-alt{background:#fafafa;}
        .bpp-totals-row,.bpp-grand-row{font-weight:bold;background:#f0f4f8;}
        .bpp-totals-label{text-align:right;padding-right:4px;}
        .bpp-grand-w{background:#e0f2fe;text-align:center;}
        .bpp-grand-o{background:#fef9c3;text-align:center;}
        .bpp-total-cell{font-weight:bold;}
        .odia-input{font-family:'Noto Sans Oriya',Kalinga,Arial,sans-serif!important;}
        @page{size:A4 landscape;margin:8mm 10mm;}
        @media print{body{padding:0;}}
      </style>
    </head><body>
      <h2>BLUEPRINT FULL MANUAL ENTRY TABLE</h2>
      <div class="meta">
        School: ${meta.school||'—'} &nbsp;|&nbsp; Class: ${meta.class||'—'} &nbsp;|&nbsp;
        Subject: ${meta.subject||'—'} &nbsp;|&nbsp; Exam: ${meta.exam||'—'} &nbsp;|&nbsp; Year: ${meta.year||'—'}
      </div>
      <table><thead>${head}</thead><tbody>${body}</tbody></table>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  });

  // Save to Library
  document.getElementById('btnBpSave')?.addEventListener('click', saveBpToLibrary);

  // Generate Format Excel (LO codes + blueprint Q-LO map)
  document.getElementById('btnExportLOExcel')?.addEventListener('click', exportLOFormatExcel);

  // Library filters
  document.getElementById('btnLibRefresh')?.addEventListener('click', loadBpLibrary);
  document.getElementById('libFilterClass')?.addEventListener('change', loadBpLibrary);
  document.getElementById('libFilterSubject')?.addEventListener('change', loadBpLibrary);

  // LO search
  document.getElementById('loSearchInput')?.addEventListener('input', renderLOMaster);

  // LO filter buttons
  document.querySelectorAll('.lo-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lo-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loFilterMode = btn.dataset.filter || 'current';
      renderLOMaster();
    });
  });

  // Init sub-modules
  initAddLO();
  initBulkUpload();

  // Initial render
  renderBlueprintTable();
});
