/* ══════════════════════════════════════════════════════════════
   aggregate.js  –  Cluster-level and Block-level LO reports
   Aggregates saved school_entries by block/cluster/class/subject
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ── FETCH AND FILTER ENTRIES ── */
async function fetchFilteredEntries(block, cluster, cls, subject, exam, year) {
  const data = await API.get('school_entries');
  let rows = data.data || [];
  if (block)   rows = rows.filter(r => r.block   && r.block.toLowerCase()   === block.toLowerCase());
  if (cluster) rows = rows.filter(r => r.cluster && r.cluster.toLowerCase() === cluster.toLowerCase());
  if (cls)     rows = rows.filter(r => r.class   === cls);
  if (subject) rows = rows.filter(r => r.subject === subject);
  if (exam)    rows = rows.filter(r => r.exam    === exam);
  if (year)    rows = rows.filter(r => r.year    === year);
  return rows;
}

/* ── AGGREGATE LO PERCENTAGES ACROSS SCHOOLS ── */
function aggregateEntries(entries) {
  if (!entries.length) return null;

  const schoolData = [];
  const allLoCodes = new Set();

  entries.forEach(entry => {
    const bp      = tryJ(entry.items) || [];
    const sd      = tryJ(entry.students) || {};
    const students = sd.students || [];
    const marks    = sd.marks    || {};
    if (!bp.length || !students.length) return;

    // Compute LO percentages for this school
    const loAllotted = {};
    const loObtained = {};

    bp.forEach(item => {
      const lo = item.loCode || '(No LO)';
      allLoCodes.add(lo);
      if (!loAllotted[lo]) loAllotted[lo] = 0;
      loAllotted[lo] += Number(item.marks||0);
    });

    Object.keys(loAllotted).forEach(lo => { loObtained[lo] = 0; });

    students.forEach(s => {
      bp.forEach(item => {
        const lo = item.loCode || '(No LO)';
        const v  = marks[s.id]?.[item.id];
        if (v !== undefined && v !== '' && v !== 'A') {
          loObtained[lo] = (loObtained[lo]||0) + (Number(v)||0);
        }
      });
    });

    const loPct = {};
    Object.keys(loAllotted).forEach(lo => {
      const maxPoss = loAllotted[lo] * students.length;
      loPct[lo] = maxPoss > 0 ? (loObtained[lo] / maxPoss) * 100 : 0;
    });

    schoolData.push({
      school: entry.school || 'Unknown',
      block: entry.block || '',
      cluster: entry.cluster || '',
      class: entry.class || '',
      subject: entry.subject || '',
      exam: entry.exam || '',
      year: entry.year || '',
      students: students.length,
      bp,
      loPct,
      loAllotted,
      loObtained
    });
  });

  return { schoolData, allLoCodes: [...allLoCodes].sort() };
}

/* ── BUILD AGGREGATE TABLE HTML ── */
function buildAggregateTable(agg, title, subtitle) {
  if (!agg || !agg.schoolData.length) {
    return `<div class="empty-state"><i class="fas fa-inbox"></i><p>No data found for the selected filters.</p></div>`;
  }

  const { schoolData, allLoCodes } = agg;

  let html = `<div class="fmt-page">
    <div class="fmt-title-block">
      <div class="fmt-main-title">${esc(title)}</div>
      <div class="fmt-format-label">${esc(subtitle)}</div>
    </div>
    <table class="fmt-table" style="font-size:8.5pt;">
      <thead>
        <tr class="fmt-tr-hdr">
          <th class="fmt-th" rowspan="2" style="width:28px;">Sl.</th>
          <th class="fmt-th" rowspan="2" style="min-width:140px;text-align:left;">School Name</th>
          <th class="fmt-th" rowspan="2" style="width:50px;">Students</th>`;

  allLoCodes.forEach(lo => {
    html += `<th class="fmt-th" style="min-width:44px;font-size:7.5pt;">${esc(lo)}</th>`;
  });

  html += `<th class="fmt-th" rowspan="2" style="width:70px;">Avg LO %</th>
        </tr>
        <tr class="fmt-tr-hdr">`;
  allLoCodes.forEach(() => {
    html += `<th class="fmt-th" style="font-size:7pt;">Ach. %</th>`;
  });
  html += `</tr></thead><tbody>`;

  // School rows
  schoolData.forEach((s, idx) => {
    const allPcts = allLoCodes.map(lo => s.loPct[lo] ?? null).filter(v => v !== null);
    const avgPct  = allPcts.length ? (allPcts.reduce((a,b) => a+b, 0) / allPcts.length) : 0;

    html += `<tr>
      <td class="fmt-td-sl">${idx+1}</td>
      <td class="fmt-td-name" style="padding-left:5px;">${esc(s.school)}</td>
      <td style="text-align:center;">${s.students}</td>`;

    allLoCodes.forEach(lo => {
      const pct   = s.loPct[lo];
      const disp  = pct !== undefined ? pct.toFixed(1)+'%' : '—';
      html += `<td style="text-align:center;">${disp}</td>`;
    });

    html += `<td style="text-align:center;font-weight:700;">${avgPct.toFixed(1)}%</td></tr>`;
  });

  // Average row
  html += `<tr class="fmt-tr-total">
    <td></td>
    <td style="font-weight:700;padding-left:5px;">AVERAGE</td>
    <td style="text-align:center;">${schoolData.reduce((s,d)=>s+d.students,0)}</td>`;

  allLoCodes.forEach(lo => {
    const pcts = schoolData.map(s => s.loPct[lo]).filter(v => v !== undefined);
    const avg  = pcts.length ? (pcts.reduce((a,b)=>a+b,0)/pcts.length) : 0;
    html += `<td style="text-align:center;font-weight:700;">${avg.toFixed(1)}%</td>`;
  });

  const allAvgs = schoolData.map(s => {
    const ps = allLoCodes.map(lo => s.loPct[lo]).filter(v=>v!==undefined);
    return ps.length ? ps.reduce((a,b)=>a+b,0)/ps.length : 0;
  });
  const overallAvg = allAvgs.length ? (allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length) : 0;
  html += `<td style="text-align:center;font-weight:700;">${overallAvg.toFixed(1)}%</td></tr>`;

  html += `</tbody></table>
    <div class="fmt-footer">
      <div class="fmt-nb"><strong>NB:</strong> Ach. % = Achievement Percentage for each LO across all students in the school</div>
      <div class="fmt-signature"><div class="fmt-sig-line">Signature of BRC/CRC</div><div class="fmt-sig-date">Date: _______________</div></div>
    </div>
  </div>`;

  return html;
}

/* ══ CLUSTER REPORT ══ */
window.renderClusterReport = function() {};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnGenerateCluster')?.addEventListener('click', async () => {
    const block   = document.getElementById('clusBlock')?.value.trim()  || '';
    const cluster = document.getElementById('clusCluster')?.value.trim()|| '';
    const cls     = document.getElementById('clusClass')?.value         || '';
    const subject = document.getElementById('clusSubject')?.value       || '';
    const exam    = document.getElementById('clusExam')?.value          || '';
    const year    = document.getElementById('clusYear')?.value.trim()   || '';

    const container = document.getElementById('clusterReportContainer');
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading school data…</div>';

    try {
      const entries = await fetchFilteredEntries(block, cluster, cls, subject, exam, year);
      if (!entries.length) {
        container.innerHTML = `<div class="card"><div class="empty-state"><i class="fas fa-inbox"></i><p>No school reports found for the selected filters.</p></div></div>`;
        return;
      }
      const agg = aggregateEntries(entries);
      const title    = `CLUSTER LEVEL LO COMPILATION FORMAT – ${exam||'ALL'} ${year||''}`;
      const subtitle = `Block: ${block||'All'} | Cluster: ${cluster||'All'} | Class ${cls||'All'} – ${subject||'All'}`;
      container.innerHTML = `<div class="card"><div class="card-header"><h2><i class="fas fa-chart-bar"></i> Cluster Report (${entries.length} schools)</h2></div>${buildAggregateTable(agg, title, subtitle)}</div>`;
    } catch(e) {
      container.innerHTML = `<div class="card"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ${e.message}</p></div></div>`;
      toast('Failed: ' + e.message, 'error');
    }
  });

  document.getElementById('btnExportClusterPdf')?.addEventListener('click', async () => {
    const container = document.getElementById('clusterReportContainer');
    if (!container?.innerHTML || container.innerHTML.includes('empty-state')) {
      toast('Generate the cluster report first.','warning'); return;
    }
    exportAggregatePdf(container, 'Cluster_LO_Report.pdf');
  });

  document.getElementById('btnExportClusterExcel')?.addEventListener('click', async () => {
    const container = document.getElementById('clusterReportContainer');
    if (!container?.innerHTML) { toast('Generate the report first.','warning'); return; }
    exportAggregateExcel(container, 'Cluster_LO_Report.xlsx');
  });

  /* ── Block ── */
  document.getElementById('btnGenerateBlock')?.addEventListener('click', async () => {
    const block   = document.getElementById('blockBlock')?.value.trim()   || '';
    const cls     = document.getElementById('blockClass')?.value          || '';
    const subject = document.getElementById('blockSubject')?.value        || '';
    const exam    = document.getElementById('blockExam')?.value           || '';
    const year    = document.getElementById('blockYear')?.value.trim()    || '';

    const container = document.getElementById('blockReportContainer');
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading data…</div>';

    try {
      const entries = await fetchFilteredEntries(block, '', cls, subject, exam, year);
      if (!entries.length) {
        container.innerHTML = `<div class="card"><div class="empty-state"><i class="fas fa-inbox"></i><p>No school reports found.</p></div></div>`;
        return;
      }
      const agg = aggregateEntries(entries);
      const title    = `BLOCK LEVEL LO COMPILATION FORMAT – ${exam||'ALL'} ${year||''}`;
      const subtitle = `Block: ${block||'All'} | Class ${cls||'All'} – ${subject||'All'}`;
      container.innerHTML = `<div class="card"><div class="card-header"><h2><i class="fas fa-chart-bar"></i> Block Report (${entries.length} schools)</h2></div>${buildAggregateTable(agg, title, subtitle)}</div>`;
    } catch(e) {
      container.innerHTML = `<div class="card"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ${e.message}</p></div></div>`;
    }
  });

  document.getElementById('btnExportBlockPdf')?.addEventListener('click', async () => {
    const container = document.getElementById('blockReportContainer');
    if (!container?.innerHTML) { toast('Generate report first.','warning'); return; }
    exportAggregatePdf(container, 'Block_LO_Report.pdf');
  });

  document.getElementById('btnExportBlockExcel')?.addEventListener('click', async () => {
    const container = document.getElementById('blockReportContainer');
    if (!container?.innerHTML) { toast('Generate report first.','warning'); return; }
    exportAggregateExcel(container, 'Block_LO_Report.xlsx');
  });
});

function exportAggregatePdf(container, filename) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  // Extract table data from rendered HTML
  const table = container.querySelector('.fmt-table');
  if (!table) { toast('No table to export.','warning'); return; }

  const rows = [];
  table.querySelectorAll('tr').forEach(tr => {
    const row = [];
    tr.querySelectorAll('td,th').forEach(cell => { row.push(cell.textContent.trim()); });
    if (row.length) rows.push(row);
  });

  if (rows.length < 2) { toast('No data.','warning'); return; }
  const head = [rows[0], rows[1]];
  const body = rows.slice(2);

  doc.autoTable({
    head, body,
    startY: 15,
    margin: {left:5, right:5},
    styles: {fontSize:6.5, cellPadding:1.5, lineColor:[0,0,0], lineWidth:0.2, textColor:[0,0,0], fillColor:false},
    headStyles: {fillColor:false, fontStyle:'bold', textColor:[0,0,0], halign:'center'},
    tableLineColor:[0,0,0], tableLineWidth:0.3
  });

  doc.save(filename);
  toast('PDF exported!');
}

function exportAggregateExcel(container, filename) {
  const table = container.querySelector('.fmt-table');
  if (!table) { toast('No table.','warning'); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
  toast('Excel exported!');
}
