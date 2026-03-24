/* ══════════════════════════════════════════════════════════════
   marks.js  –  Marks Entry Table
   EXACT LAYOUT (matches DIET Ganjam format screenshot):

   HEADER (5 rows):
     ROW 0  Section banner  │ WRITTEN QUESTIONS (Q.1 to N)              │ ORAL QUESTIONS (Q.1 to N)   │
     ROW 1  LO Code         │ M412 │ M409 │ M403 │ M401 │ M401 │ M401 … │ M410 │ M411 │ …            │
             (each question shows its own LO code – no colspan grouping)
     ROW 2  Q. Serial No.   │  1   │  2   │  3   │  4   │  5   │  6  … │  1   │  2   │ …            │
     ROW 3  Q. Label        │ 6(c) │7(i)  │  2   │  5   │ 7(c) │  3  … │  9   │  4   │ …            │
     ROW 4  Allotted Marks  │  1   │  1   │  1   │  1   │  1   │  1  … │  4   │  1   │ …            │

   Then Oral section with same structure.

   BODY:
     Each student row → Sl | Name | marks per question… | Grand Total

   SUMMARY rows:
     Column Total | Max Possible | Q-wise % | LO-wise %
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ── ODIA ↔ ENGLISH LABEL MAPPING ── */
const ODIA_VOWEL_MAP = {
  'କ':'a','ଖ':'b','ଗ':'c','ଘ':'d','ଙ':'e',
  'ଚ':'f','ଛ':'g','ଜ':'h','ଝ':'i','ଞ':'j',
  'ଟ':'k','ଠ':'l','ଡ':'m','ଢ':'n','ଣ':'o',
  'ତ':'p','ଥ':'q','ଦ':'r','ଧ':'s','ନ':'t',
  'ପ':'u','ଫ':'v','ବ':'w','ଭ':'x','ମ':'y','ଯ':'z',
};
const ODIA_DIGIT_MAP = {
  '୦':'0','୧':'1','୨':'2','୩':'3','୪':'4',
  '୫':'5','୬':'6','୭':'7','୮':'8','୯':'9'
};

function odiaToEnglish(label) {
  if (!label) return '';
  let out = '';
  for (const ch of label) {
    out += ODIA_DIGIT_MAP[ch] || ODIA_VOWEL_MAP[ch] || ch;
  }
  return out;
}
function hasOdia(str) { return /[\u0B00-\u0B7F]/.test(str); }
function formatLabel(label) {
  if (!label) return '';
  if (hasOdia(label)) {
    const en = odiaToEnglish(label);
    return en !== label ? `${label}(${en})` : label;
  }
  return label;
}

/* ── SPLIT blueprint into Written-first, then Oral ── */
function getOrderedItems(bp) {
  const writtenItems = bp.filter(i => i.section !== 'Oral');
  const oralItems    = bp.filter(i => i.section === 'Oral');
  return { writtenItems, oralItems };
}

/* ── Group items by LO code (preserving order of first appearance) ── */
function groupByLO(items) {
  const order = [], map = {};
  items.forEach(item => {
    const lo = item.loCode || '(No LO)';
    if (!map[lo]) { map[lo] = { lo, items:[] }; order.push(lo); }
    map[lo].items.push(item);
  });
  return order.map(lo => map[lo]);
}

/* ── Student total across ALL questions ── */
function stuTotal(sid) {
  let t = 0;
  APP.blueprint.forEach(item => {
    const v = APP.marks[sid]?.[item.id];
    if (v !== undefined && v !== '' && v !== 'A') t += Number(v)||0;
  });
  return t;
}

/* ── Column total (all students for one question item) ── */
function colTotal(bid) {
  return APP.students.reduce((s, st) => {
    const v = APP.marks[st.id]?.[bid];
    return s + (v && v !== 'A' ? Number(v)||0 : 0);
  }, 0);
}

/* ══════════════════════════════════════════════════════════════
   RENDER MARKS TABLE
   ══════════════════════════════════════════════════════════════ */
window.renderMarksTable = function() {
  const outer = document.getElementById('marksTableOuter');
  if (!outer) return;
  const bp  = APP.blueprint;
  const stu = APP.students;

  if (!bp.length || !stu.length) {
    outer.innerHTML = `<div class="empty-state">
      <i class="fas fa-table"></i>
      <p>Add blueprint items and students first, then enter marks here.</p>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="navigateTo('blueprint')">
          <i class="fas fa-sitemap"></i> Blueprint
        </button>
        <button class="btn btn-outline btn-sm" onclick="navigateTo('students')">
          <i class="fas fa-users"></i> Students
        </button>
      </div>
    </div>`;
    return;
  }

  stu.forEach(s => { if (!APP.marks[s.id]) APP.marks[s.id] = {}; });

  const { writtenItems, oralItems } = getOrderedItems(bp);
  const writtenGroups = groupByLO(writtenItems);
  const oralGroups    = groupByLO(oralItems);
  const allOrderedItems = [...writtenItems, ...oralItems];
  const totalBp = bp.reduce((s,i) => s + Number(i.marks||0), 0);

  /* ═══ TABLE ═══ */
  let html = `<table class="marks-table" id="marksTable">`;
  html += `<thead>`;

  /* ─────────────────────────────────────────────────────────
     ROW 0 – Section Banner
     Fixed: Sl.No (rowspan=5), Student Name (rowspan=5)
     then Written section banner, then Oral section banner
     ───────────────────────────────────────────────────────── */
  html += `<tr class="mhdr-section-row">
    <th class="mhdr-fixed-corner" rowspan="5">Sl.<br>No.</th>
    <th class="mhdr-fixed-name"   rowspan="5">Student Name</th>`;

  if (writtenItems.length) {
    html += `<th class="mhdr-section-label written-section" colspan="${writtenItems.length}">
      &#9997; WRITTEN QUESTIONS &nbsp;(Q. 1 &ndash; ${writtenItems.length})
    </th>`;
  }
  if (oralItems.length) {
    html += `<th class="mhdr-section-label oral-section" colspan="${oralItems.length}">
      &#128483; ORAL QUESTIONS &nbsp;(Q. 1 &ndash; ${oralItems.length})
    </th>`;
  }

  html += `<th class="mhdr-fixed-total" rowspan="5">
    Grand<br>Total<br><small>(${totalBp})</small>
  </th></tr>`;

  /* ─────────────────────────────────────────────────────────
     ROW 1 – LO Code per individual question (no colspan grouping)
     Each question column shows its own LO code
     ───────────────────────────────────────────────────────── */
  html += `<tr class="mhdr-lo-row">`;
  writtenItems.forEach(item => {
    const lo = item.loCode || '(No LO)';
    html += `<th class="mhdr-lo mhdr-lo-w">${esc(lo)}</th>`;
  });
  oralItems.forEach(item => {
    const lo = item.loCode || '(No LO)';
    html += `<th class="mhdr-lo mhdr-lo-o">${esc(lo)}</th>`;
  });
  html += `</tr>`;

  /* ─────────────────────────────────────────────────────────
     ROW 2 – Q. Serial Number within section (1, 2, 3 …)
     ───────────────────────────────────────────────────────── */
  html += `<tr class="mhdr-serial-row">`;
  writtenItems.forEach((item, idx) => {
    html += `<th class="mhdr-serial mhdr-serial-w">${idx + 1}</th>`;
  });
  oralItems.forEach((item, idx) => {
    html += `<th class="mhdr-serial mhdr-serial-o">${idx + 1}</th>`;
  });
  html += `</tr>`;

  /* ─────────────────────────────────────────────────────────
     ROW 3 – Q. Label (original: 1(a), 6(c), 7(i) …)
     ───────────────────────────────────────────────────────── */
  html += `<tr class="mhdr-label-row">`;
  writtenItems.forEach(item => {
    const lbl = formatLabel(item.qLabel || '');
    const sect = item.section === 'Both' ? '(w+o)' : '(w)';
    html += `<th class="mhdr-qlabel mhdr-qlabel-w odia-input"
      title="Max: ${item.marks} | LO: ${esc(item.loCode||'')}">
      ${esc(lbl)}<br><span class="mhdr-sect-tag">${sect}</span>
    </th>`;
  });
  oralItems.forEach(item => {
    const lbl = formatLabel(item.qLabel || '');
    html += `<th class="mhdr-qlabel mhdr-qlabel-o odia-input"
      title="Max: ${item.marks} | LO: ${esc(item.loCode||'')}">
      ${esc(lbl)}<br><span class="mhdr-sect-tag">(o)</span>
    </th>`;
  });
  html += `</tr>`;

  /* ─────────────────────────────────────────────────────────
     ROW 4 – Allotted Marks per question
     ───────────────────────────────────────────────────────── */
  html += `<tr class="mhdr-marks-row">`;
  writtenItems.forEach(item => {
    html += `<th class="mhdr-allot mhdr-allot-w">${item.marks}</th>`;
  });
  oralItems.forEach(item => {
    html += `<th class="mhdr-allot mhdr-allot-o">${item.marks}</th>`;
  });
  html += `</tr>`;

  html += `</thead><tbody>`;

  /* ─────────────────────────────────────────────────────────
     STUDENT ROWS
     ───────────────────────────────────────────────────────── */
  stu.forEach((s, idx) => {
    html += `<tr class="mrow-student">
      <td class="mtd-sl">${idx + 1}</td>
      <td class="mtd-name odia-input" title="${esc(s.roll||'')}">${esc(s.name)}</td>`;

    allOrderedItems.forEach((item, qIdx) => {
      const isOral   = item.section === 'Oral';
      const v        = APP.marks[s.id]?.[item.id];
      const ab       = v === 'A';
      const display  = (v !== undefined && v !== '') ? esc(String(v)) : '';
      const firstOral = isOral && qIdx === writtenItems.length;
      html += `<td class="mtd-mark${isOral ? ' mtd-oral' : ''}${firstOral ? ' mtd-oral-first' : ''}">
        <input type="text"
          class="marks-cell${ab ? ' absent' : ''}"
          value="${display}"
          data-sid="${s.id}"
          data-bid="${item.id}"
          data-max="${item.marks}"
          data-lo="${esc(item.loCode||'(No LO)')}"
          data-section="${isOral ? 'oral' : 'written'}"
          maxlength="5"
          onchange="onMark(this)"
          onkeydown="mkNav(event,this)"
        />
      </td>`;
    });

    const tot = stuTotal(s.id);
    html += `<td class="mtd-rowtotal" id="tot-${s.id}">${tot > 0 ? tot : ''}</td></tr>`;
  });

  /* ─────────────────────────────────────────────────────────
     SUMMARY ROWS
     ───────────────────────────────────────────────────────── */

  /* Column Total */
  html += `<tr class="mrow-summary mrow-coltotal">
    <td class="mtd-sum-label" colspan="2">Column Total</td>`;
  allOrderedItems.forEach((item, qIdx) => {
    const ct = colTotal(item.id);
    const isOral = item.section === 'Oral';
    const firstOral = isOral && qIdx === writtenItems.length;
    html += `<td class="mtd-coltotal${firstOral?' mtd-oral-first':''}" id="qtot-${item.id}">${ct}</td>`;
  });
  const grandTotal = stu.reduce((s,st) => s + stuTotal(st.id), 0);
  html += `<td class="mtd-rowtotal"><strong>${grandTotal}</strong></td></tr>`;

  /* Max Possible */
  html += `<tr class="mrow-summary mrow-maxposs">
    <td class="mtd-sum-label" colspan="2">Max Possible</td>`;
  allOrderedItems.forEach((item, qIdx) => {
    const firstOral = item.section==='Oral' && qIdx===writtenItems.length;
    html += `<td class="mtd-maxposs${firstOral?' mtd-oral-first':''}">${Number(item.marks)*stu.length}</td>`;
  });
  html += `<td class="mtd-rowtotal">${totalBp*stu.length}</td></tr>`;

  /* Q-wise % */
  html += `<tr class="mrow-summary mrow-qpct">
    <td class="mtd-sum-label" colspan="2">Q-wise %</td>`;
  allOrderedItems.forEach((item, qIdx) => {
    const ct = colTotal(item.id);
    const maxP = Number(item.marks)*stu.length;
    const pct = maxP>0 ? ((ct/maxP)*100).toFixed(1)+'%' : '—';
    const firstOral = item.section==='Oral' && qIdx===writtenItems.length;
    html += `<td class="mtd-qpct${firstOral?' mtd-oral-first':''}" id="qpct-${item.id}">${pct}</td>`;
  });
  html += `<td></td></tr>`;

  /* LO-wise % (one merged cell per LO per section) */
  const allLOGroups = [
    ...writtenGroups.map(g=>({...g,sec:'written'})),
    ...oralGroups.map(g=>({...g,sec:'oral'}))
  ];
  html += `<tr class="mrow-summary mrow-lopct">
    <td class="mtd-sum-label" colspan="2">LO-wise %</td>`;
  allLOGroups.forEach((group, gi) => {
    const lo = group.lo;
    const loAllot = group.items.reduce((s,i)=>s+Number(i.marks||0),0);
    const loObt   = group.items.reduce((s,i)=>s+colTotal(i.id),0);
    const maxP    = loAllot*stu.length;
    const loPct   = maxP>0 ? ((loObt/maxP)*100).toFixed(1)+'%' : '—';
    const safeId  = lo.replace(/[^a-z0-9]/gi,'_');
    /* first oral group gets left separator */
    const firstOral = group.sec==='oral' && gi===writtenGroups.length;
    html += `<td class="mtd-lo-pct-cell${firstOral?' mtd-oral-first':''}" colspan="${group.items.length}"
      id="lo-ovpct-${safeId}-${group.sec}">
      <span class="lo-pct-code">${esc(lo)}</span>
      <span class="lo-pct-val">${loPct}</span>
    </td>`;
  });
  html += `<td></td></tr>`;

  html += `</tbody></table>`;
  outer.innerHTML = html;

  /* Status bar */
  const statusEl = document.getElementById('marksStatusText');
  if (statusEl) {
    const filled = countFilledCells();
    const total  = bp.length * stu.length;
    statusEl.innerHTML = `<i class="fas fa-chart-bar"></i>&nbsp;
      ${filled}/${total} cells filled &nbsp;|&nbsp;
      ${stu.length} students &nbsp;|&nbsp;
      &#9997; Written: ${writtenItems.length} &nbsp;|&nbsp;
      &#128483; Oral: ${oralItems.length} &nbsp;|&nbsp;
      Total: ${bp.length} questions`;
  }
};

function countFilledCells() {
  let n = 0;
  APP.students.forEach(s => {
    APP.blueprint.forEach(item => {
      const v = APP.marks[s.id]?.[item.id];
      if (v !== undefined && v !== '') n++;
    });
  });
  return n;
}

/* ══ MARK CHANGE HANDLER ══ */
window.onMark = function(inp) {
  const sid = inp.dataset.sid;
  const bid = inp.dataset.bid;
  const max = Number(inp.dataset.max);
  const lo  = inp.dataset.lo;
  const sec = inp.dataset.section;
  let val   = inp.value.trim().toUpperCase();

  if (!APP.marks[sid]) APP.marks[sid] = {};

  if (val === '' || val === '-') {
    delete APP.marks[sid][bid];
    inp.classList.remove('absent','over-max');
    inp.style.outline = '';
    updateLiveTotals(sid, bid, lo, sec);
    return;
  }

  if (val === 'A') {
    APP.marks[sid][bid] = 'A';
    inp.classList.add('absent');
    inp.classList.remove('over-max');
    inp.style.outline = '';
    updateLiveTotals(sid, bid, lo, sec);
    return;
  }

  const num = parseFloat(val);
  if (isNaN(num) || num < 0) {
    toast(`Enter a valid mark (0 – ${max}) or A for absent`, 'warning');
    inp.value = '';
    delete APP.marks[sid][bid];
    inp.classList.remove('absent','over-max');
    inp.style.outline = '';
    return;
  }

  /* ★ Strict over-max validation ★ */
  if (num > max) {
    toast(`❌ Mark ${num} exceeds maximum ${max} for this question! Entry cleared.`, 'error');
    inp.value = '';
    delete APP.marks[sid][bid];
    inp.classList.add('over-max');
    inp.style.outline = '2px solid #dc2626';
    setTimeout(() => { inp.classList.remove('over-max'); inp.style.outline = ''; }, 2000);
    return;
  }

  APP.marks[sid][bid] = num;
  inp.classList.remove('absent','over-max');
  inp.style.outline = '';
  inp.value = String(num);
  updateLiveTotals(sid, bid, lo, sec);
};

/* ── LIVE TOTAL UPDATER ── */
function updateLiveTotals(sid, bid, lo, sec) {
  const tot   = stuTotal(sid);
  const totEl = document.getElementById(`tot-${sid}`);
  if (totEl) totEl.textContent = tot > 0 ? tot : '';

  const ct     = colTotal(bid);
  const qTotEl = document.getElementById(`qtot-${bid}`);
  if (qTotEl) qTotEl.textContent = ct;

  const item = APP.blueprint.find(i => i.id === bid);
  if (item) {
    const maxP = Number(item.marks)*APP.students.length;
    const pct  = maxP>0 ? ((ct/maxP)*100).toFixed(1)+'%' : '—';
    const qEl  = document.getElementById(`qpct-${bid}`);
    if (qEl) qEl.textContent = pct;
  }

  const safeLo = lo.replace(/[^a-z0-9]/gi,'_');
  const loEl   = document.getElementById(`lo-ovpct-${safeLo}-${sec}`);
  if (loEl) {
    const loItems = APP.blueprint.filter(i =>
      (i.loCode||'(No LO)') === lo &&
      (sec==='oral' ? i.section==='Oral' : i.section!=='Oral')
    );
    const loAllot = loItems.reduce((s,i)=>s+Number(i.marks||0),0);
    const loObt   = loItems.reduce((s,i)=>s+colTotal(i.id),0);
    const maxP    = loAllot*APP.students.length;
    const loPct   = maxP>0 ? ((loObt/maxP)*100).toFixed(1)+'%' : '—';
    loEl.innerHTML = `<span class="lo-pct-code">${esc(lo)}</span><span class="lo-pct-val">${loPct}</span>`;
  }

  updateDashboardStats();
}

/* ══ KEYBOARD NAVIGATION ══ */
window.mkNav = function(e, inp) {
  if (!['Tab','Enter','ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key)) return;
  const allInputs = Array.from(document.querySelectorAll('#marksTable .marks-cell'));
  const idx = allInputs.indexOf(inp);
  const nQ  = APP.blueprint.length;
  let next  = null;
  switch (e.key) {
    case 'Tab': case 'Enter': case 'ArrowRight': next = allInputs[idx+1]; break;
    case 'ArrowLeft':  next = allInputs[idx-1]; break;
    case 'ArrowDown':  next = allInputs[idx+nQ]; break;
    case 'ArrowUp':    next = allInputs[idx-nQ]; break;
  }
  if (next) { e.preventDefault(); next.focus(); next.select(); }
};

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnSaveMarks')?.addEventListener('click', () => window.saveAllData?.());
  document.getElementById('btnClearMarks')?.addEventListener('click', () => {
    if (!confirm('Clear ALL entered marks? This cannot be undone.')) return;
    APP.marks = {};
    renderMarksTable();
    toast('All marks cleared.', 'info');
  });
});
