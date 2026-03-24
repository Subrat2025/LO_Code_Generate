/* ══════════════════════════════════════════════════════════════
   preview.js  –  Official Format-A Report Generator

   KEY RULES:
   1. NO "DIET Ganjam, Khallikote" heading
   2. Format-A → ONE A4 landscape page (scale both W × H to fit preview)
   3. LO Summary → ONE A4 landscape page
   4. Columns = LO codes sorted LOW → HIGH (alphanumeric)
      Under each LO: exact question labels (e.g. 1, 6(a), 8(d)) for W and O
      Grand Total per LO per student (W + O combined)
   5. NO Max Possible row in Format-A table
   6. LO Wise % row: per-LO % in each LO column,
      OVERALL % shown in Grand Total cell of that row
   7. LO descriptions NOT shown in table
   8. Plain black-border Calibri, no color fills
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ── ODIA → ENGLISH ── */
function odiaLabelToEn(label) {
  if (!label) return '';
  const DIG = {'୦':'0','୧':'1','୨':'2','୩':'3','୪':'4','୫':'5','୬':'6','୭':'7','୮':'8','୯':'9'};
  const VOW = {'କ':'a','ଖ':'b','ଗ':'c','ଘ':'d','ଙ':'e','ଚ':'f','ଛ':'g','ଜ':'h','ଝ':'i','ଞ':'j',
               'ଟ':'k','ଠ':'l','ଡ':'m','ଢ':'n','ଣ':'o','ତ':'p','ଥ':'q','ଦ':'r','ଧ':'s','ନ':'t',
               'ପ':'u','ଫ':'v','ବ':'w','ଭ':'x','ମ':'y','ଯ':'z'};
  let out=''; for (const ch of label) out+=DIG[ch]||VOW[ch]||ch; return out;
}
function fmtLabel(label) {
  if (!label) return '';
  if (/[\u0B00-\u0B7F]/.test(label)) { const en=odiaLabelToEn(label); return en!==label?`${label}(${en})`:label; }
  return label;
}

/* ── SORT LO CODES: lower to higher alphanumeric ──
   e.g. M401 < M403 < M409 < M412 < M416 < M421
*/
function sortLOCode(a, b) {
  /* Extract leading letters + trailing number for proper numeric sort */
  const parse = s => {
    const m = String(s).match(/^([A-Za-z]*)(\d+)(.*)$/);
    if (m) return { pfx: m[1].toUpperCase(), num: parseInt(m[2], 10), sfx: m[3].toUpperCase() };
    return { pfx: String(s).toUpperCase(), num: 0, sfx: '' };
  };
  const pa = parse(a), pb = parse(b);
  if (pa.pfx !== pb.pfx) return pa.pfx < pb.pfx ? -1 : 1;
  if (pa.num !== pb.num) return pa.num - pb.num;
  return pa.sfx < pb.sfx ? -1 : pa.sfx > pb.sfx ? 1 : 0;
}

/* ── BUILD LO GROUPS (sorted low → high) ──
   Each group: lo, wItems[], oItems[], allItems[],
               wLabels[]  (exact question labels for written),
               oLabels[]  (exact question labels for oral),
               totalAllot
*/
function buildLOGroups(bp) {
  const wItems = bp.filter(i => i.section !== 'Oral');
  const oItems = bp.filter(i => i.section === 'Oral');

  /* Map item.id → exact display label (fmtLabel of qLabel) */
  const wLblMap = {}, oLblMap = {};
  wItems.forEach(item => { wLblMap[item.id] = fmtLabel(item.qLabel || '') || '?'; });
  oItems.forEach(item => { oLblMap[item.id] = fmtLabel(item.qLabel || '') || '?'; });

  /* Build unsorted map */
  const order = [], map = {};
  bp.forEach(item => {
    const lo = item.loCode || '(No LO)';
    if (!map[lo]) { map[lo] = { lo, wItems: [], oItems: [] }; order.push(lo); }
    if (item.section === 'Oral') map[lo].oItems.push(item);
    else                          map[lo].wItems.push(item);
  });

  /* Sort LO codes low → high */
  const sortedLOs = order.slice().sort(sortLOCode);

  return sortedLOs.map(lo => {
    const g = map[lo];
    return {
      lo: g.lo,
      wItems: g.wItems,
      oItems: g.oItems,
      allItems: [...g.wItems, ...g.oItems],
      /* exact labels for each question */
      wLabels: g.wItems.map(i => wLblMap[i.id]),
      oLabels: g.oItems.map(i => oLblMap[i.id]),
      wAllot:  g.wItems.reduce((s, i) => s + Number(i.marks || 0), 0),
      oAllot:  g.oItems.reduce((s, i) => s + Number(i.marks || 0), 0),
      totalAllot: g.wItems.reduce((s, i) => s + Number(i.marks || 0), 0) +
                  g.oItems.reduce((s, i) => s + Number(i.marks || 0), 0)
    };
  });
}

/* ── LO-level marks per student ── */
function loStuTotal(group, sid) {
  let t = 0;
  group.allItems.forEach(item => {
    const v = APP.marks[sid]?.[item.id];
    if (v !== undefined && v !== '' && v !== 'A') t += Number(v) || 0;
  });
  return t;
}

/* ── LO column total (all students) ── */
function loColSum(group, students) {
  return students.reduce((s, st) => s + loStuTotal(group, st.id), 0);
}

/* ── Student grand total across all LO groups ── */
function stuGrandTotal(groups, sid) {
  return groups.reduce((s, g) => s + loStuTotal(g, sid), 0);
}

/* ══════════════════════════════════════════════════════════════
   BUILD FORMAT-A HTML
   - No Max Possible row
   - LO Wise % row: per-LO % per column, overall % in Grand Total cell
   - W/O rows show exact question labels (e.g. "1, 6(a), 8(d)")
   - LO columns sorted low → high
   ══════════════════════════════════════════════════════════════ */
function buildFormatA(meta, groups, students) {
  const examLabel = `${meta.exam} RESULT ANALYSIS ${meta.year}`;
  const totalBp   = groups.reduce((s, g) => s + g.totalAllot, 0);

  let html = `<div class="fmt-page fmt-format-a" id="fmtPageA">
  <div class="fmt-title-block">
    <div class="fmt-main-title">SCHOOL LEVEL COMPILATION FORMAT FOR ${esc(examLabel)}</div>
    <div class="fmt-format-label">FORMAT &ndash; A</div>
  </div>
  <div class="fmt-meta-row">
    <div class="fmt-meta-cell"><b>DISTRICT:</b> ${esc(meta.district || 'GANJAM')}</div>
    <div class="fmt-meta-cell"><b>BLOCK:</b> ${esc(meta.block || '')}</div>
    <div class="fmt-meta-cell"><b>CLUSTER:</b> ${esc(meta.cluster || '')}</div>
    <div class="fmt-meta-cell"><b>SCHOOL:</b> ${esc(meta.school || '')}</div>
    <div class="fmt-meta-cell"><b>CLASS:</b> ${esc(meta.class || '')}</div>
    <div class="fmt-meta-cell no-border-right"><b>SUBJECT:</b> ${esc(meta.subject || '')}</div>
  </div>

  <table class="fmt-table fmt-a-table">
  <thead>
    <tr class="fmt-tr-hdr">
      <th class="fmt-th fmt-th-sl"  rowspan="4">Sl.</th>
      <th class="fmt-th fmt-th-name" rowspan="4">Name of Student</th>`;

  /* Row 1 – LO codes */
  groups.forEach(g => {
    html += `<th class="fmt-th fmt-th-lo">${esc(g.lo)}</th>`;
  });
  html += `<th class="fmt-th fmt-th-grand" rowspan="4">Grand<br>Total<br><span class="fmt-grand-max">(${totalBp})</span></th>
    </tr>
    <tr class="fmt-tr-hdr">`;

  /* Row 2 – Written question labels (exact: "1, 6(a), 8(d)") */
  groups.forEach(g => {
    const wText = g.wLabels.length ? g.wLabels.join(', ') : '&mdash;';
    html += `<th class="fmt-th fmt-th-wnos"><span class="fmt-w-tag">W:</span> ${wText}</th>`;
  });
  html += `</tr><tr class="fmt-tr-hdr">`;

  /* Row 3 – Oral question labels */
  groups.forEach(g => {
    const oText = g.oLabels.length ? g.oLabels.join(', ') : '&mdash;';
    html += `<th class="fmt-th fmt-th-onos"><span class="fmt-o-tag">O:</span> ${oText}</th>`;
  });
  html += `</tr><tr class="fmt-tr-hdr">`;

  /* Row 4 – Allotted marks per LO */
  groups.forEach(g => {
    html += `<th class="fmt-th fmt-th-allot">${g.totalAllot}</th>`;
  });
  html += `</tr>
  </thead>
  <tbody>`;

  /* ── Student rows ── */
  if (!students.length) {
    for (let i = 0; i < 30; i++) {
      html += `<tr><td class="fmt-td-sl">${i + 1}</td><td class="fmt-td-name">&nbsp;</td>`;
      groups.forEach(() => html += `<td class="fmt-td-mark">&nbsp;</td>`);
      html += `<td class="fmt-td-grand">&nbsp;</td></tr>`;
    }
  } else {
    students.forEach((s, idx) => {
      html += `<tr><td class="fmt-td-sl">${idx + 1}</td>
        <td class="fmt-td-name">${esc(s.name)}</td>`;
      groups.forEach(g => {
        const tot  = loStuTotal(g, s.id);
        const allA = g.allItems.every(i => APP.marks[s.id]?.[i.id] === 'A');
        const any  = g.allItems.some(i => { const v = APP.marks[s.id]?.[i.id]; return v !== undefined && v !== ''; });
        html += `<td class="fmt-td-mark">${allA ? 'A' : (any ? tot : '')}</td>`;
      });
      const grand = stuGrandTotal(groups, s.id);
      html += `<td class="fmt-td-grand">${grand > 0 ? grand : ''}</td></tr>`;
    });
  }

  /* ── Total Marks of Students row ── */
  html += `<tr class="fmt-tr-total">
    <td colspan="2" class="fmt-sum-label">Total Marks of Students</td>`;
  let grandSum = 0;
  groups.forEach(g => {
    const ct = loColSum(g, students); grandSum += ct;
    html += `<td class="fmt-td-mark">${students.length ? ct : ''}</td>`;
  });
  html += `<td class="fmt-td-grand">${students.length ? grandSum : ''}</td></tr>`;

  /* ── LO Wise % row  (NO Max Possible row) ──
     Each LO column: per-LO %
     Grand Total cell: overall % across all LOs
  */
  html += `<tr class="fmt-tr-lopct">
    <td colspan="2" class="fmt-sum-label">LO Wise %</td>`;
  let totalObt = 0, totalMax = 0;
  groups.forEach(g => {
    const obt = loColSum(g, students);
    const mp  = g.totalAllot * students.length;
    totalObt += obt; totalMax += mp;
    const pct = students.length && mp > 0 ? ((obt / mp) * 100).toFixed(1) + '%' : '';
    html += `<td class="fmt-td-lopct">${pct}</td>`;
  });
  const overallPct = students.length && totalMax > 0
    ? ((totalObt / totalMax) * 100).toFixed(1) + '%'
    : '';
  html += `<td class="fmt-td-grand fmt-td-overall-pct">${overallPct}</td></tr>`;

  html += `</tbody></table>

  <div class="fmt-footer">
    <div class="fmt-nb">
      <b>NB:</b> W&nbsp;=&nbsp;Written Questions &nbsp;|&nbsp; O&nbsp;=&nbsp;Oral Questions<br>
      LO wise % = <u>Total Marks obtained by all students in that LO &times; 100</u><br>
      &emsp;&emsp;&emsp;&emsp;&emsp;&nbsp;No. of Students &times; Total Allotted Marks of that LO
    </div>
    <div class="fmt-signature">
      <div class="fmt-sig-line">Signature of HM</div>
      <div class="fmt-sig-date">Date: _______________</div>
    </div>
  </div>
  </div>`;

  return html;
}

/* ══════════════════════════════════════════════════════════════
   BUILD LO SUMMARY PAGE (sorted low → high, exact labels)
   ══════════════════════════════════════════════════════════════ */
function buildLOSummary(meta, groups, students) {
  let totalObt = 0, totalMax = 0;
  let rows = '';

  groups.forEach((g, idx) => {
    const obt  = loColSum(g, students);
    const mp   = g.totalAllot * students.length;
    const pct  = mp > 0 ? (obt / mp) * 100 : 0;
    totalObt  += obt; totalMax += mp;
    const level = pct >= 70 ? 'High' : pct >= 40 ? 'Medium' : 'Low';
    /* exact labels */
    const wText = g.wLabels.join(', ') || '—';
    const oText = g.oLabels.join(', ') || '—';
    rows += `<tr>
      <td class="fmt-td-sl">${idx + 1}</td>
      <td style="text-align:center;font-weight:700;">${esc(g.lo)}</td>
      <td style="text-align:center;">${esc(wText)}</td>
      <td style="text-align:center;">${esc(oText)}</td>
      <td style="text-align:center;">${g.totalAllot}</td>
      <td style="text-align:center;">${obt}</td>
      <td style="text-align:center;">${mp}</td>
      <td style="text-align:center;font-weight:700;">${pct.toFixed(1)}%</td>
      <td style="text-align:center;">${students.length ? level : '—'}</td>
    </tr>`;
  });

  const overallPct = totalMax > 0 ? (totalObt / totalMax * 100) : 0;
  rows += `<tr class="fmt-tr-total">
    <td colspan="4" style="text-align:right;font-weight:700;padding-right:6px;">TOTAL / OVERALL</td>
    <td style="text-align:center;font-weight:700;"></td>
    <td style="text-align:center;font-weight:700;">${totalObt}</td>
    <td style="text-align:center;font-weight:700;">${totalMax}</td>
    <td style="text-align:center;font-weight:700;">${overallPct.toFixed(1)}%</td>
    <td></td>
  </tr>`;

  return `<div class="fmt-page fmt-summary-page" id="fmtPageSum">
  <div class="fmt-title-block">
    <div class="fmt-main-title">LO-WISE ACHIEVEMENT SUMMARY &ndash; ${esc(meta.exam)} ${esc(meta.year)}</div>
    <div class="fmt-format-label">Class ${esc(meta.class)} &ndash; ${esc(meta.subject)}</div>
  </div>
  <div class="fmt-meta-row">
    <div class="fmt-meta-cell"><b>SCHOOL:</b> ${esc(meta.school || '')}</div>
    <div class="fmt-meta-cell"><b>BLOCK:</b> ${esc(meta.block || '')}</div>
    <div class="fmt-meta-cell"><b>CLUSTER:</b> ${esc(meta.cluster || '')}</div>
    <div class="fmt-meta-cell no-border-right"><b>TOTAL STUDENTS:</b> ${students.length}</div>
  </div>
  <table class="fmt-table fmt-sum-table">
    <thead>
      <tr class="fmt-tr-hdr">
        <th class="fmt-th" style="width:28px;">Sl.</th>
        <th class="fmt-th" style="width:68px;">LO Code</th>
        <th class="fmt-th">Written Q. Nos.</th>
        <th class="fmt-th">Oral Q. Nos.</th>
        <th class="fmt-th">Allotted<br>/Student</th>
        <th class="fmt-th">Total Marks<br>Obtained</th>
        <th class="fmt-th">Max Marks<br>Possible</th>
        <th class="fmt-th">LO Achievement %</th>
        <th class="fmt-th">Level</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="fmt-footer">
    <div class="fmt-nb">
      <b>NB:</b> High &ge; 70% &nbsp;|&nbsp; Medium 40&ndash;69% &nbsp;|&nbsp; Low &lt; 40%<br>
      W = Written Questions &nbsp;|&nbsp; O = Oral Questions &nbsp;|&nbsp;
      LO codes sorted low &rarr; high
    </div>
    <div class="fmt-signature">
      <div class="fmt-sig-line">Signature of HM</div>
      <div class="fmt-sig-date">Date: _______________</div>
    </div>
  </div>
  </div>`;
}

/* ══ RENDER PREVIEW (on-screen) ══ */
window.renderPreview = function () {
  const container = document.getElementById('previewContainer');
  if (!container) return;
  const { meta, blueprint: bp, students: stu } = APP;

  if (!bp.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fas fa-file-alt"></i>
      <p>Add blueprint items first to generate the report.</p>
      <button class="btn btn-primary btn-sm" onclick="navigateTo('blueprint')">Go to Blueprint</button>
    </div>`;
    return;
  }

  const groups = buildLOGroups(bp);
  let html = buildFormatA(meta, groups, stu);

  if (stu.length && groups.length) {
    html += '<div class="fmt-page-break"></div>';
    html += buildLOSummary(meta, groups, stu);
  }

  container.innerHTML = html;

  /* Scale both pages to fit the preview container (W × H) */
  requestAnimationFrame(() => {
    autoScalePage('fmtPageA');
    autoScalePage('fmtPageSum');
  });
};

/* ── Auto-scale a page div to fill its container both width AND height ──
   A4 landscape: 297 × 210 mm → at 96 dpi ≈ 1122 × 794 px (gross)
   With typical margins (5mm each side) usable ≈ 267mm × 190mm ≈ 1009 × 718 px
   We scale to fill the previewContainer width; if the scaled height would
   overflow the container we also clamp by height so no scrollbar is needed.
*/
function autoScalePage(id) {
  const el = document.getElementById(id);
  if (!el) return;

  /* A4 landscape usable dimensions (px @ 96 dpi) */
  const A4_W = 1009; // 267 mm
  const A4_H = 718;  // 190 mm (landscape height minus margins)

  /* Reset transforms so we can measure real size */
  el.style.transform = '';
  el.style.marginBottom = '';

  const container = el.closest('.preview-container') || el.parentElement;
  const availW = container ? container.clientWidth - 32 : A4_W; // 32px = 2×16px padding
  const availH = container ? container.clientHeight - 48 : A4_H; // approx

  const naturalW = el.scrollWidth;
  const naturalH = el.scrollHeight;

  /* Scale to fit width first */
  let scale = availW / naturalW;

  /* If fitting by width still makes the page taller than the available height,
     also constrain by height so the full page is visible without scrolling */
  if (naturalH * scale > availH && availH > 100) {
    scale = Math.min(scale, availH / naturalH);
  }

  if (scale < 1) {
    el.style.transformOrigin = 'top left';
    el.style.transform = `scale(${scale})`;
    /* Collapse the extra space the scaled-down element would otherwise occupy */
    el.style.marginBottom = `-${Math.round(naturalH * (1 - scale))}px`;
    el.style.marginRight  = `-${Math.round(naturalW * (1 - scale))}px`;
    if (container) container.style.overflowX = 'hidden';
  } else {
    el.style.transform = '';
    el.style.marginBottom = '';
    el.style.marginRight  = '';
  }
}

/* ══ PRINT WINDOW ══ */
function doPrint() {
  renderPreview();
  setTimeout(() => {
    const content = document.getElementById('previewContainer')?.innerHTML || '';
    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) { toast('Pop-up blocked! Please allow pop-ups and try again.', 'error'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Format-A &ndash; ${APP.meta.school || 'Report'}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Oriya:wght@400;700&display=swap" rel="stylesheet">
      <style>
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{width:297mm;}
        body{font-family:Calibri,Arial,sans-serif;font-size:8pt;background:#fff;}
        .odia-input{font-family:'Noto Sans Oriya',Kalinga,Arial,sans-serif!important;}
        .fmt-page{padding:5mm 6mm;width:297mm;max-width:297mm;overflow:hidden;}
        .fmt-title-block{text-align:center;margin-bottom:4px;}
        .fmt-main-title{font-size:9.5pt;font-weight:bold;text-transform:uppercase;margin:2px 0;}
        .fmt-format-label{font-size:8.5pt;font-weight:bold;}
        .fmt-meta-row{display:flex;border:1px solid #000;margin-bottom:3px;}
        .fmt-meta-cell{flex:1;padding:2px 5px;font-size:7.5pt;border-right:1px solid #000;}
        .no-border-right{border-right:none!important;}
        /* Equal-width LO columns, text wraps, all values centred */
        .fmt-table{width:100%;border-collapse:collapse;font-size:7pt;table-layout:fixed;}
        .fmt-table th,.fmt-table td{border:1px solid #000;padding:2px 2px;vertical-align:middle;
          text-align:center;overflow:hidden;word-wrap:break-word;white-space:normal;}
        .fmt-th{font-weight:bold;background:#fff!important;}
        .fmt-th-sl{width:18px;}
        .fmt-th-name{text-align:left!important;padding-left:3px;width:100px;}
        .fmt-td-name{text-align:left!important;padding-left:3px;font-size:7.5pt;}
        .fmt-th-lo{font-size:7.5pt;font-weight:bold;}
        .fmt-th-wnos{font-size:6.5pt;font-weight:normal;line-height:1.3;}
        .fmt-th-onos{font-size:6.5pt;font-weight:normal;font-style:italic;line-height:1.3;}
        .fmt-th-allot{font-size:7.5pt;font-weight:bold;}
        .fmt-th-grand{width:32px;}
        .fmt-grand-max{font-size:6pt;font-weight:normal;display:block;}
        .fmt-w-tag{font-weight:bold;font-size:6pt;}
        .fmt-o-tag{font-weight:bold;font-size:6pt;font-style:italic;}
        .fmt-td-sl{font-size:7pt;}
        .fmt-td-mark{font-size:8pt;}
        .fmt-td-grand{font-weight:bold;font-size:8pt;}
        .fmt-td-overall-pct{font-size:7pt;font-weight:bold;}
        .fmt-sum-label{text-align:right!important;font-weight:bold;font-size:6.5pt;padding-right:4px;white-space:nowrap;}
        .fmt-tr-total td{font-weight:bold;font-size:7pt;}
        .fmt-tr-lopct td{font-weight:bold;font-size:7pt;}
        .fmt-td-lopct{font-weight:bold;}
        .fmt-footer{display:flex;justify-content:space-between;align-items:flex-start;margin-top:4px;font-size:7pt;}
        .fmt-nb{max-width:78%;line-height:1.5;}
        .fmt-signature{text-align:right;}
        .fmt-sig-line{font-weight:bold;margin-bottom:3px;}
        .fmt-sig-date{color:#555;}
        .fmt-page-break{page-break-after:always;height:1px;}
        .fmt-format-a{transform-origin:top left;}
        @page{size:A4 landscape;margin:5mm 6mm;}
        @media print{
          .fmt-format-a,.fmt-summary-page{transform:none!important;width:100%!important;}
          .fmt-page-break{page-break-after:always;}
          body{-webkit-print-color-adjust:exact;}
        }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
  }, 350);
}

/* ══ EXPORT PDF ══ */
function exportPDF() {
  if (!APP.blueprint.length) { toast('No blueprint data.', 'warning'); return; }
  toast('Generating PDF…', 'info');

  const { jsPDF } = window.jspdf;
  const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const meta   = APP.meta;
  const stu    = APP.students;
  const groups = buildLOGroups(APP.blueprint); // already sorted low→high

  const pdfTotalBp = groups.reduce((s, g) => s + g.totalAllot, 0);

  /* ── Page 1: Format-A ── */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(`SCHOOL LEVEL COMPILATION FORMAT FOR ${meta.exam} RESULT ANALYSIS ${meta.year}`, 148.5, 10, { align: 'center' });
  doc.setFontSize(8); doc.text('FORMAT \u2013 A', 148.5, 15, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  const mRow = [`DISTRICT:${meta.district || 'GANJAM'}`, `BLOCK:${meta.block || ''}`,
    `CLUSTER:${meta.cluster || ''}`, `SCHOOL:${meta.school || ''}`,
    `CLASS:${meta.class || ''}`, `SUBJECT:${meta.subject || ''}`];
  mRow.forEach((m, i) => doc.text(m, 10 + i * 43, 21));

  const hRow1 = ['Sl.', 'Name of Student'];
  const hRow2 = ['', ''];
  const hRow3 = ['', ''];
  const hRow4 = ['', 'Allotted\u2192'];
  groups.forEach(g => {
    hRow1.push(g.lo);
    hRow2.push('W: ' + (g.wLabels.join(', ') || '\u2014'));
    hRow3.push('O: ' + (g.oLabels.join(', ') || '\u2014'));
    hRow4.push(String(g.totalAllot));
  });
  hRow1.push(`Grand Total (${pdfTotalBp})`); hRow2.push(''); hRow3.push(''); hRow4.push('');

  const body = [];
  if (!stu.length) {
    for (let i = 0; i < 20; i++) body.push([i + 1, '', ...groups.map(() => ''), '']);
  } else {
    stu.forEach((s, idx) => {
      const r = [idx + 1, s.name];
      groups.forEach(g => {
        const tot  = loStuTotal(g, s.id);
        const allA = g.allItems.every(i => APP.marks[s.id]?.[i.id] === 'A');
        const any  = g.allItems.some(i => { const v = APP.marks[s.id]?.[i.id]; return v !== undefined && v !== ''; });
        r.push(allA ? 'A' : (any ? String(tot) : ''));
      });
      const grand = stuGrandTotal(groups, s.id);
      r.push(grand > 0 ? String(grand) : '');
      body.push(r);
    });
  }

  /* Total Marks row */
  const totRow = ['', 'Total Marks']; let gSum = 0;
  groups.forEach(g => { const ct = loColSum(g, stu); gSum += ct; totRow.push(String(ct)); });
  totRow.push(String(gSum)); body.push(totRow);

  /* LO Wise % row (no Max Possible) */
  const pctRow = ['', 'LO Wise %'];
  let tObt = 0, tMax = 0;
  groups.forEach(g => {
    const obt = loColSum(g, stu), mp = g.totalAllot * stu.length;
    tObt += obt; tMax += mp;
    pctRow.push(stu.length && mp > 0 ? ((obt / mp) * 100).toFixed(1) + '%' : '');
  });
  const ovPct = stu.length && tMax > 0 ? ((tObt / tMax) * 100).toFixed(1) + '%' : '';
  pctRow.push(ovPct); body.push(pctRow);

  doc.autoTable({
    head: [hRow1, hRow2, hRow3, hRow4], body,
    startY: 25, margin: { left: 5, right: 5 },
    styles: { font: 'helvetica', fontSize: 6, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0], fillColor: false, overflow: 'linebreak' },
    headStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 6 },
    columnStyles: { 0: { halign: 'center', cellWidth: 7 }, 1: { halign: 'left', cellWidth: 28 } },
    tableLineColor: [0, 0, 0], tableLineWidth: 0.3,
  });

  const fY = doc.lastAutoTable.finalY + 3;
  doc.setFontSize(5.5);
  doc.text('NB: W=Written | O=Oral | LO wise % = Total obtained \u00d7 100 / (No. of Students \u00d7 Total Allotted Marks)', 10, fY + 4);
  doc.text('Signature of HM: ___________________', 200, fY + 10, { align: 'right' });

  /* ── Page 2: LO Summary ── */
  if (stu.length) {
    doc.addPage();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('LO-WISE ACHIEVEMENT SUMMARY', 148.5, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`${meta.exam} ${meta.year} | Class ${meta.class} \u2013 ${meta.subject} | ${meta.school || ''}`, 148.5, 18, { align: 'center' });

    const sumHead = [['Sl', 'LO Code', 'Written Q. Nos.', 'Oral Q. Nos.', 'Allotted/Student', 'Total Obtained', 'Max Possible', 'Achievement %', 'Level']];
    const sumBody = groups.map((g, idx) => {
      const obt = loColSum(g, stu), mp = g.totalAllot * stu.length, pct = mp > 0 ? (obt / mp) * 100 : 0;
      return [idx + 1, g.lo, g.wLabels.join(', ') || '\u2014', g.oLabels.join(', ') || '\u2014',
        g.totalAllot, obt, mp, pct.toFixed(1) + '%', pct >= 70 ? 'High' : pct >= 40 ? 'Medium' : 'Low'];
    });
    const tO = groups.reduce((s, g) => s + loColSum(g, stu), 0);
    const tM = groups.reduce((s, g) => s + g.totalAllot * stu.length, 0);
    sumBody.push(['', '', 'OVERALL', '', '', tO, tM, tM > 0 ? ((tO / tM) * 100).toFixed(1) + '%' : '', '']);

    doc.autoTable({
      head: sumHead, body: sumBody, startY: 23,
      margin: { left: 5, right: 5 },
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0], fillColor: false },
      headStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 18 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 }, 7: { halign: 'center' }, 8: { halign: 'center' } },
    });
  }

  doc.save(`LO_Format_A_Class${meta.class}_${meta.subject}_${meta.exam}_${meta.year}.pdf`.replace(/\s/g, '_'));
  toast('PDF exported!');
}

/* ══ EXPORT EXCEL ══ */
function exportExcel() {
  const bp = APP.blueprint, stu = APP.students;
  if (!bp.length) { toast('No data.', 'warning'); return; }
  const meta = APP.meta, groups = buildLOGroups(bp), wb = XLSX.utils.book_new();

  const rows = [];
  rows.push([`SCHOOL LEVEL COMPILATION FORMAT FOR ${meta.exam} RESULT ANALYSIS ${meta.year}`]);
  rows.push(['FORMAT \u2013 A']);
  rows.push([]);
  rows.push([`DISTRICT:${meta.district || 'GANJAM'}`, `BLOCK:${meta.block || ''}`, `CLUSTER:${meta.cluster || ''}`, `SCHOOL:${meta.school || ''}`, `CLASS:${meta.class || ''}`, `SUBJECT:${meta.subject || ''}`]);
  rows.push([]);

  const pdfTotalBp = groups.reduce((s, g) => s + g.totalAllot, 0);
  const hLO = ['Sl.', 'Name of Student', ...groups.map(g => g.lo), `Grand Total (${pdfTotalBp})`];
  const hW  = ['', 'W (Written Q. Nos.)', ...groups.map(g => 'W: ' + (g.wLabels.join(', ') || '\u2014')), ''];
  const hO  = ['', 'O (Oral Q. Nos.)',   ...groups.map(g => 'O: ' + (g.oLabels.join(', ') || '\u2014')), ''];
  const hA  = ['', 'Allotted \u2192',    ...groups.map(g => g.totalAllot), ''];
  rows.push(hLO, hW, hO, hA);

  if (!stu.length) {
    for (let i = 0; i < 20; i++) rows.push([i + 1, '', ...groups.map(() => ''), '']);
  } else {
    stu.forEach((s, idx) => {
      const r = [idx + 1, s.name];
      groups.forEach(g => {
        const tot  = loStuTotal(g, s.id);
        const allA = g.allItems.every(i => APP.marks[s.id]?.[i.id] === 'A');
        const any  = g.allItems.some(i => { const v = APP.marks[s.id]?.[i.id]; return v !== undefined && v !== ''; });
        r.push(allA ? 'A' : (any ? tot : ''));
      });
      r.push(stuGrandTotal(groups, s.id) || '');
      rows.push(r);
    });
  }

  const tR = ['', 'Total Marks']; let gS = 0;
  groups.forEach(g => { const ct = loColSum(g, stu); gS += ct; tR.push(ct); });
  tR.push(gS); rows.push(tR);

  /* LO Wise % row with overall % in last cell (no Max Possible row) */
  const pR = ['', 'LO Wise %'];
  let tO2 = 0, tM2 = 0;
  groups.forEach(g => {
    const obt = loColSum(g, stu), mp = g.totalAllot * stu.length;
    tO2 += obt; tM2 += mp;
    pR.push(stu.length && mp > 0 ? ((obt / mp) * 100).toFixed(1) + '%' : '');
  });
  pR.push(stu.length && tM2 > 0 ? ((tO2 / tM2) * 100).toFixed(1) + '%' : '');
  rows.push(pR);
  rows.push([], ['NB: W=Written, O=Oral. LO wise % = Total obtained \u00d7 100 / (No. of Students \u00d7 Total Allotted Marks)']);

  const ws1 = XLSX.utils.aoa_to_sheet(rows);
  ws1['!cols'] = [{ wch: 5 }, { wch: 30 }, ...groups.map(() => ({ wch: 16 })), { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Format-A');

  if (stu.length) {
    const sRows = [];
    sRows.push(['LO-WISE ACHIEVEMENT SUMMARY'], [`${meta.exam} ${meta.year} | Class ${meta.class} \u2013 ${meta.subject} | ${meta.school || ''}`], []);
    sRows.push(['Sl', 'LO Code', 'Written Q. Nos.', 'Oral Q. Nos.', 'Allotted/Student', 'Total Obtained', 'Max Possible', 'Achievement %', 'Level']);
    groups.forEach((g, idx) => {
      const obt = loColSum(g, stu), mp = g.totalAllot * stu.length, pct = mp > 0 ? (obt / mp) * 100 : 0;
      sRows.push([idx + 1, g.lo, g.wLabels.join(', ') || '\u2014', g.oLabels.join(', ') || '\u2014',
        g.totalAllot, obt, mp, pct.toFixed(1) + '%', pct >= 70 ? 'High' : pct >= 40 ? 'Medium' : 'Low']);
    });
    const tO3 = groups.reduce((s, g) => s + loColSum(g, stu), 0);
    const tM3 = groups.reduce((s, g) => s + g.totalAllot * stu.length, 0);
    sRows.push(['', '', 'OVERALL', '', '', tO3, tM3, tM3 > 0 ? ((tO3 / tM3) * 100).toFixed(1) + '%' : '', '']);
    const ws2 = XLSX.utils.aoa_to_sheet(sRows);
    ws2['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'LO Summary');
  }

  XLSX.writeFile(wb, `LO_Format_A_Class${meta.class}_${meta.subject}_${meta.exam}_${meta.year}.xlsx`.replace(/\s/g, '_'));
  toast('Excel exported!');
}

/* ══ EXPORT CSV ══ */
function exportCSV() {
  const bp = APP.blueprint, stu = APP.students;
  if (!bp.length) { toast('No data.', 'warning'); return; }
  const meta = APP.meta, groups = buildLOGroups(bp);
  const e2 = v => { const s = String(v ?? ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const row = (...cols) => cols.map(e2).join(',') + '\n';

  const pdfTotalBp = groups.reduce((s, g) => s + g.totalAllot, 0);
  let csv = '\uFEFF';
  csv += row(`LO Format-A – ${meta.exam} ${meta.year} | Class ${meta.class} – ${meta.subject} | ${meta.school || ''}`);
  csv += row('');
  csv += row('Sl.', 'Name', ...groups.map(g => g.lo), `Grand Total (${pdfTotalBp})`);
  csv += row('', 'W Nos.', ...groups.map(g => 'W:' + (g.wLabels.join(', ') || '—')), '');
  csv += row('', 'O Nos.', ...groups.map(g => 'O:' + (g.oLabels.join(', ') || '—')), '');
  csv += row('', 'Allotted', ...groups.map(g => g.totalAllot), '');

  if (!stu.length) {
    for (let i = 0; i < 20; i++) csv += row(i + 1, '', ...groups.map(() => ''), '');
  } else {
    stu.forEach((s, idx) => {
      const r = [idx + 1, s.name];
      groups.forEach(g => {
        const tot  = loStuTotal(g, s.id);
        const allA = g.allItems.every(i => APP.marks[s.id]?.[i.id] === 'A');
        const any  = g.allItems.some(i => { const v = APP.marks[s.id]?.[i.id]; return v !== undefined && v !== ''; });
        r.push(allA ? 'A' : (any ? tot : ''));
      });
      r.push(stuGrandTotal(groups, s.id) || '');
      csv += row(...r);
    });
  }

  let gSum = 0;
  const tVals = groups.map(g => { const ct = loColSum(g, stu); gSum += ct; return ct; });
  csv += row('', 'Total Marks', ...tVals, gSum);

  let tO4 = 0, tM4 = 0;
  const pVals = groups.map(g => {
    const obt = loColSum(g, stu), mp = g.totalAllot * stu.length;
    tO4 += obt; tM4 += mp;
    return stu.length && mp > 0 ? ((obt / mp) * 100).toFixed(1) + '%' : '';
  });
  const ovPct4 = stu.length && tM4 > 0 ? ((tO4 / tM4) * 100).toFixed(1) + '%' : '';
  csv += row('', 'LO Wise %', ...pVals, ovPct4);
  csv += row('', 'NB: W=Written, O=Oral. LO wise% = Total obtained x 100 / (Students x Allotted Marks)');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `LO_Format_A_Class${meta.class}_${meta.subject}_${meta.exam}_${meta.year}.csv`.replace(/\s/g, '_');
  a.click();
  toast('CSV exported!');
}

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnRefreshPreview')?.addEventListener('click', renderPreview);
  document.getElementById('btnExportPdf')?.addEventListener('click', exportPDF);
  document.getElementById('btnExportExcel')?.addEventListener('click', exportExcel);
  document.getElementById('btnExportCsv')?.addEventListener('click', exportCSV);
  document.getElementById('btnPrint')?.addEventListener('click', doPrint);
});
