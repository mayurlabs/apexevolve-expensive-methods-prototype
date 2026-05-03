// PDF generator for the ApexGuru Insight Report (V264 Lean Pilot).
//
// Scenarios:
//   (1) Baseline — user never invoked ApexEvolve → plain Expensive Methods report (like today).
//   (2) ApexEvolve invoked → consolidated report: baseline list, plus inline detail for each
//       optimized method (verdict, rationale narrative, scores, before/after code).
//   (3) Single-method focus — per-card download surfaces just that one method's detail + a
//       slimmer cover page.
//
// The per-method rationale narratives come from data/optimizationReports.js (in the real product
// these would come from backend-generated summarizer output; see applications/apex/summarizer.py
// in the CodeEvolve repo).

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CRITICAL_METHODS, EXPENSIVE_METHODS, ALL_METHODS } from '../data/methods';
import { getReportForMethod } from '../data/optimizationReports';

// ———————————————————————————————————————————————————————————————
// Layout helpers

const SF_BLUE = [0, 112, 210];        // #0070d2
const SF_NAV = [3, 45, 96];           // #032d60
const SF_TEXT = [8, 7, 7];
const SF_TEXT_SECONDARY = [112, 110, 107];
const SF_BORDER = [221, 219, 218];
const SF_SUCCESS = [46, 132, 74];
const SF_ERROR = [194, 57, 52];
const SF_WARN = [254, 147, 57];
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function addHeader(doc, reportDate, titleOverride) {
  doc.setFillColor(...SF_NAV);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(titleOverride || 'ApexGuru Insight Report', MARGIN, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${reportDate}`, MARGIN, 16);
  doc.setTextColor(...SF_TEXT);
}

function addFooter(doc, pageNum, totalPages) {
  doc.setFontSize(8);
  doc.setTextColor(...SF_TEXT_SECONDARY);
  doc.text(
    'Salesforce confidential — AI-assisted recommendations. Review before applying to production.',
    MARGIN,
    PAGE_H - 10
  );
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
  doc.setTextColor(...SF_TEXT);
}

function sectionTitle(doc, text, y, color = SF_TEXT) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...color);
  doc.text(text, MARGIN, y);
  doc.setTextColor(...SF_TEXT);
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

function bodyText(doc, text, y, size = 9) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...SF_TEXT);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  doc.text(lines, MARGIN, y);
  return y + lines.length * (size * 0.4) + 2;
}

function ensureSpace(doc, y, needed = 40) {
  if (y + needed > PAGE_H - 20) {
    doc.addPage();
    return 30;
  }
  return y;
}

function codeBlock(doc, label, code, y) {
  y = ensureSpace(doc, y, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SF_TEXT_SECONDARY);
  doc.text(label, MARGIN, y);
  y += 4;
  const lines = doc.splitTextToSize(code, CONTENT_W - 6);
  const blockHeight = lines.length * 3.8 + 4;
  y = ensureSpace(doc, y, blockHeight + 4);
  doc.setFillColor(245, 246, 249);
  doc.setDrawColor(...SF_BORDER);
  doc.roundedRect(MARGIN, y, CONTENT_W, blockHeight, 1, 1, 'FD');
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SF_TEXT);
  doc.text(lines, MARGIN + 3, y + 4);
  doc.setFont('helvetica', 'normal');
  return y + blockHeight + 5;
}

function arrow(pair) {
  const delta = pair[1] - pair[0];
  if (delta > 0.001) return `+${delta.toFixed(3)} up`;
  if (delta < -0.001) return `${delta.toFixed(3)} down`;
  return '—';
}

// ———————————————————————————————————————————————————————————————
// Markdown-ish rationale renderer. The reports in optimizationReports.js are in markdown with
// headings, tables, bullets, inline code, and bold. For the PDF we do a lightweight parse —
// fancy enough to render the real reports readably, without pulling in a full markdown library.

function renderRationaleNarrative(doc, y, markdown) {
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.replace(/```/g, '').trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimEnd().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      y = codeBlock(doc, lang ? `${lang}:` : 'Code:', codeLines.join('\n'), y);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      y = ensureSpace(doc, y, 6);
      doc.setDrawColor(...SF_BORDER);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y - 1, PAGE_W - MARGIN, y - 1);
      y += 3;
      i++;
      continue;
    }

    // Headings
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      y = ensureSpace(doc, y, 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SF_TEXT);
      doc.text(stripInline(h1[1]), MARGIN, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      i++;
      continue;
    }
    if (h2) {
      y = ensureSpace(doc, y, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...SF_NAV);
      doc.text(stripInline(h2[1]), MARGIN, y);
      y += 4.5;
      doc.setDrawColor(...SF_BORDER);
      doc.line(MARGIN, y - 2.5, PAGE_W - MARGIN, y - 2.5);
      doc.setTextColor(...SF_TEXT);
      doc.setFont('helvetica', 'normal');
      i++;
      continue;
    }
    if (h3) {
      y = ensureSpace(doc, y, 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...SF_TEXT);
      doc.text(stripInline(h3[1]), MARGIN, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      i++;
      continue;
    }

    // Table — parse contiguous `| ... |` lines
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const tableLines = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        y = renderMdTable(doc, y, tableLines);
      }
      continue;
    }

    // Bulleted list
    if (/^\s*[-*]\s+/.test(line)) {
      const bullets = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        bullets.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      y = ensureSpace(doc, y, bullets.length * 4 + 2);
      doc.setFontSize(8.5);
      doc.setTextColor(...SF_TEXT);
      for (const b of bullets) {
        const wrapped = doc.splitTextToSize('•  ' + stripInline(b), CONTENT_W - 4);
        y = ensureSpace(doc, y, wrapped.length * 3.8 + 1);
        doc.text(wrapped, MARGIN + 2, y);
        y += wrapped.length * 3.8 + 0.5;
      }
      y += 1;
      continue;
    }

    // Blank line
    if (line === '') {
      y += 2;
      i++;
      continue;
    }

    // Regular paragraph
    doc.setFontSize(9);
    doc.setTextColor(...SF_TEXT);
    const wrapped = doc.splitTextToSize(stripInline(line), CONTENT_W);
    y = ensureSpace(doc, y, wrapped.length * 3.8 + 2);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 3.8 + 1;
    i++;
  }
  return y + 2;
}

// Strip inline markdown (bold, inline code, em, links) to plain text for PDF rendering.
function stripInline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/&nbsp;/g, ' ');
}

function renderMdTable(doc, y, tableLines) {
  // First row = header, second = separator (|---|---|), rest = body
  const parseRow = (row) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => stripInline(c.trim()));
  const header = parseRow(tableLines[0]);
  const body = tableLines.slice(2).map(parseRow);
  if (body.length === 0) return y;
  autoTable(doc, {
    startY: y,
    head: [header],
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [240, 240, 240], textColor: SF_TEXT, fontStyle: 'bold' },
    margin: { left: MARGIN, right: MARGIN },
  });
  return doc.lastAutoTable.finalY + 3;
}

// ———————————————————————————————————————————————————————————————
// Section renderers

function renderSummary(doc, y, reportDate, optimizedMethodIds) {
  y = sectionTitle(doc, 'Executive Summary', y);
  doc.setFontSize(9);
  const criticalCount = CRITICAL_METHODS.length;
  const expensiveCount = EXPENSIVE_METHODS.length;
  const totalCount = criticalCount + expensiveCount;
  const optimizedCount = optimizedMethodIds.length;

  const lines = [
    `Report date: ${reportDate}`,
    `Total expensive methods flagged: ${totalCount} (${criticalCount} critical, ${expensiveCount} expensive)`,
  ];
  if (optimizedCount > 0) {
    lines.push(
      `Methods optimized with ApexEvolve this run: ${optimizedCount}`,
      '',
      'ApexEvolve doesn\'t just rewrite — it proves. Each optimized method includes the evolved code, a governor-limit-aware rationale across CPU, SOQL, heap, and bulk-safety dimensions, and a semantic-equivalence guarantee. Review in a sandbox before production use.'
    );
  } else {
    lines.push('ApexEvolve was not invoked for this report — no optimization recommendations included.');
  }
  lines.forEach((line) => {
    y = bodyText(doc, line, y);
  });
  return y + 2;
}

function renderMethodListTable(doc, y, methods, startIndex, optimizedSet) {
  const rows = methods.map((m, i) => [
    `${startIndex + i + 1}`,
    m.name + (optimizedSet.has(m.id) ? '  [Optimized with ApexEvolve]' : ''),
    `${m.cpuImpact}%`,
    m.invocationFrequency,
    m.category,
  ]);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Method', 'CPU', 'Freq', 'Category']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: SF_NAV, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: SF_TEXT, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'right' },
      1: { cellWidth: 108 },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 22 },
      4: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        if (optimizedSet.has(methods[data.row.index].id)) {
          data.cell.styles.textColor = SF_SUCCESS;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  return doc.lastAutoTable.finalY + 4;
}

// Render the Proof Panel condensed summary (matches the UI default view) — goes at the top
// of each optimized method's PDF section before the long-form narrative.
function renderProofPanel(doc, y, report) {
  if (!report.proof) return y;
  const proof = report.proof;

  // ── Verdict band
  y = ensureSpace(doc, y, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SF_TEXT_SECONDARY);
  doc.text('VERDICT', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SF_TEXT);
  const verdictLines = doc.splitTextToSize(report.verdict, CONTENT_W);
  doc.text(verdictLines, MARGIN, y + 4);
  y += 4 + verdictLines.length * 3.8 + 4;

  // ── What Changed — numbered deltas
  y = ensureSpace(doc, y, 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SF_TEXT_SECONDARY);
  doc.text(`WHAT CHANGED  (${proof.whatChanged.length} concrete ${proof.whatChanged.length === 1 ? 'fix' : 'fixes'})`, MARGIN, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  proof.whatChanged.forEach((change, i) => {
    y = ensureSpace(doc, y, 8);
    // Numbered circle badge
    doc.setFillColor(232, 240, 250);
    doc.circle(MARGIN + 2.5, y - 1.2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...SF_BLUE);
    doc.text(`${i + 1}`, MARGIN + 2.5, y + 0.3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SF_TEXT);
    const lines = doc.splitTextToSize(change, CONTENT_W - 10);
    doc.text(lines, MARGIN + 7, y);
    y += lines.length * 3.8 + 1.5;
  });
  y += 3;

  // ── Why It Matters — dot-rated dimensional table
  y = ensureSpace(doc, y, 15 + proof.whyItMatters.length * 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SF_TEXT_SECONDARY);
  doc.text('WHY IT MATTERS', MARGIN, y);
  y += 4;

  // Render each dimension as a row: dimension name | 5 dots | one-liner
  proof.whyItMatters.forEach((dim, i) => {
    const rowH = 7;
    y = ensureSpace(doc, y, rowH + 2);
    // Alternating row background for readability
    if (i % 2 === 1) {
      doc.setFillColor(249, 250, 252);
      doc.rect(MARGIN, y - 1, CONTENT_W, rowH, 'F');
    }
    // Dimension name (left column)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...SF_TEXT);
    doc.text(dim.dimension, MARGIN + 1, y + 3.5);

    // Dot rating (middle column) — 5 circles, first N filled with severity color
    const dotColor = dim.rating >= 4 ? SF_SUCCESS : dim.rating >= 3 ? SF_BLUE : dim.rating >= 2 ? SF_WARN : [200, 200, 200];
    for (let d = 0; d < 5; d++) {
      const cx = MARGIN + 42 + d * 3;
      if (d < dim.rating) {
        doc.setFillColor(...dotColor);
      } else {
        doc.setFillColor(220, 220, 220);
      }
      doc.circle(cx, y + 3.3, 1, 'F');
    }

    // One-liner (right column)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...SF_TEXT);
    const ollines = doc.splitTextToSize(dim.oneLiner, CONTENT_W - 64);
    doc.text(ollines, MARGIN + 60, y + 3.5);
    y += Math.max(rowH, ollines.length * 3.5 + 3);
  });
  y += 3;

  // ── Before You Apply — caveats
  y = ensureSpace(doc, y, 12 + proof.beforeYouApply.length * 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SF_TEXT_SECONDARY);
  doc.text('BEFORE YOU APPLY', MARGIN, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SF_TEXT);
  proof.beforeYouApply.forEach((c) => {
    const lines = doc.splitTextToSize(`•  ${c}`, CONTENT_W - 4);
    y = ensureSpace(doc, y, lines.length * 3.5 + 1);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * 3.5 + 1;
  });

  return y + 3;
}

function renderOptimizedMethodDetail(doc, y, method) {
  const report = getReportForMethod(method.id);
  y = ensureSpace(doc, y, 70);

  // Left accent bar — subtle visual grouping so each method detail feels like a coherent unit
  const sectionStartY = y;

  // Method header band — green success tint with rounded corners
  doc.setFillColor(235, 245, 230);
  doc.setDrawColor(...SF_SUCCESS);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, 11, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...SF_SUCCESS);
  doc.text(`[Optimized with ApexEvolve]  ${method.name}`, MARGIN + 3, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setLineWidth(0.2);
  doc.setTextColor(...SF_TEXT);
  y += 15;

  // Severity + context metadata strip
  doc.setFontSize(8);
  doc.setTextColor(...SF_TEXT_SECONDARY);
  doc.text(
    `Severity: ${method.severity === 'critical' ? 'Critical' : 'Expensive'}   |   CPU: ${method.cpuImpact}%   |   Freq: ${method.invocationFrequency}   |   Category: ${method.category}`,
    MARGIN,
    y
  );
  y += 5;
  doc.setTextColor(...SF_TEXT);
  y = bodyText(doc, `Reason flagged: ${method.reason}`, y, 8);
  y += 3;

  // ── SECTION: Proof Panel (condensed summary — matches the UI default)
  y = renderSectionHeader(doc, y, 'Summary  —  The proof in 30 seconds', SF_BLUE);
  y = renderProofPanel(doc, y, report);

  // ── SECTION: Scores table
  y = ensureSpace(doc, y, 40);
  y = renderSectionHeader(doc, y, 'Quality scores', SF_BLUE);
  const s = report.scores;
  autoTable(doc, {
    startY: y,
    head: [['Dimension', 'Original', 'Optimized', 'Change']],
    body: [
      ['Code Quality Score', s.quality[0].toFixed(3), s.quality[1].toFixed(3), arrow(s.quality)],
      ['Code Efficiency Score', s.efficiency[0].toFixed(3), s.efficiency[1].toFixed(3), arrow(s.efficiency)],
      ['Static Analysis Score', s.staticAnalysis[0].toFixed(3), s.staticAnalysis[1].toFixed(3), arrow(s.staticAnalysis)],
      ['Code Semantic Score', s.semantic[0].toFixed(3), s.semantic[1].toFixed(3), arrow(s.semantic)],
      [
        { content: 'Combined Score', styles: { fontStyle: 'bold' } },
        { content: s.combined[0].toFixed(3), styles: { fontStyle: 'bold' } },
        { content: s.combined[1].toFixed(3), styles: { fontStyle: 'bold' } },
        { content: arrow(s.combined), styles: { fontStyle: 'bold' } },
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: SF_NAV, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 'auto', halign: 'left' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const content = String(data.cell.raw || '');
        if (content.startsWith('+')) data.cell.styles.textColor = SF_SUCCESS;
        else if (content.startsWith('-')) data.cell.styles.textColor = SF_ERROR;
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = doc.lastAutoTable.finalY + 4;

  // ── SECTION: Code comparison
  y = ensureSpace(doc, y, 20);
  y = renderSectionHeader(doc, y, 'Code comparison', SF_BLUE);
  y = codeBlock(doc, 'Original code:', report.originalCode, y);
  y = codeBlock(doc, 'Optimized code (ApexEvolve recommendation):', report.optimizedCode, y);

  // ── SECTION: Full rationale narrative (long-form, preserved per stakeholder direction)
  y = ensureSpace(doc, y, 20);
  y = renderSectionHeader(doc, y, 'Full analysis  —  governor-limit deep dive', SF_BLUE);
  y = renderRationaleNarrative(doc, y, report.report);

  return y + 8;
}

// Section header with left accent bar and bottom rule — visually separates the Proof Panel,
// Scores, Code, and Full Analysis sections within one method's detail block.
function renderSectionHeader(doc, y, label, accent = SF_BLUE) {
  y = ensureSpace(doc, y, 8);
  // Left accent bar
  doc.setFillColor(...accent);
  doc.rect(MARGIN, y - 2.5, 2, 5, 'F');
  // Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SF_NAV);
  doc.text(label, MARGIN + 5, y + 1);
  // Bottom rule (thin)
  doc.setDrawColor(...SF_BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN + 5, y + 3, PAGE_W - MARGIN, y + 3);
  doc.setTextColor(...SF_TEXT);
  doc.setFont('helvetica', 'normal');
  return y + 7;
}

function renderDisclaimer(doc, y) {
  y = ensureSpace(doc, y, 40);
  y = sectionTitle(doc, 'Disclaimer', y);
  const disclaimer = [
    '• These are AI-assisted recommendations. Review and validate in a sandbox before production use.',
    '• Optimized code may require minor modifications before it compiles in your org.',
    '• Some existing unit tests may need updates to reflect the optimized logic.',
    '• Performance improvements are typical for expensive methods but are not guaranteed for every case.',
    '• Business logic is preserved (measured by Code Semantic Score), but always review changes.',
    '• Salesforce does not apply any code changes automatically. You remain in control.',
  ];
  doc.setFontSize(8);
  disclaimer.forEach((line) => {
    const lines = doc.splitTextToSize(line, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 3.5 + 1;
  });
  return y;
}

// ———————————————————————————————————————————————————————————————
// Public API

export function generateInsightReport({ reportDate, optimizedMethodIds = [], singleMethodFocus = false }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const optimizedSet = new Set(optimizedMethodIds);

  if (singleMethodFocus && optimizedMethodIds.length === 1) {
    // Per-card single-method PDF — slim cover, then jump to the method detail.
    const method = ALL_METHODS.find((m) => m.id === optimizedMethodIds[0]);
    addHeader(doc, reportDate, 'ApexEvolve Optimization Report');
    let y = 30;
    y = sectionTitle(doc, `Method: ${method?.name || 'unknown'}`, y, SF_SUCCESS);
    doc.setFontSize(9);
    const intro = `This report covers a single method optimized with ApexEvolve on ${reportDate}. Verdict, scores, original vs optimized code, and the governor-limit-aware rationale follow below.`;
    y = bodyText(doc, intro, y);
    y += 4;
    if (method) y = renderOptimizedMethodDetail(doc, y, method);
    y = renderDisclaimer(doc, y);
  } else {
    // Consolidated report — baseline scenario OR full multi-method ApexEvolve run.
    addHeader(doc, reportDate);
    let y = 30;
    y = renderSummary(doc, y, reportDate, optimizedMethodIds);

    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, 'Critical Expensive Methods', y, SF_ERROR);
    y = renderMethodListTable(doc, y, CRITICAL_METHODS, 0, optimizedSet);

    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, 'Expensive Methods', y, SF_WARN);
    y = renderMethodListTable(doc, y, EXPENSIVE_METHODS, CRITICAL_METHODS.length, optimizedSet);

    if (optimizedMethodIds.length > 0) {
      doc.addPage();
      addHeader(doc, reportDate);
      y = 30;
      y = sectionTitle(doc, 'ApexEvolve Optimization Details', y, SF_SUCCESS);
      doc.setFontSize(8);
      doc.setTextColor(...SF_TEXT_SECONDARY);
      const intro = `Detailed recommendations for the ${optimizedMethodIds.length} method${optimizedMethodIds.length > 1 ? 's' : ''} optimized in this run. Each includes verdict, scores, original vs optimized code, and a governor-limit-aware rationale across CPU, SOQL, heap, and bulk-safety dimensions.`;
      const iLines = doc.splitTextToSize(intro, CONTENT_W);
      doc.text(iLines, MARGIN, y);
      y += iLines.length * 3.5 + 4;
      doc.setTextColor(...SF_TEXT);

      optimizedMethodIds.forEach((mid) => {
        const m = ALL_METHODS.find((x) => x.id === mid);
        if (!m) return;
        y = renderOptimizedMethodDetail(doc, y, m);
      });
    }

    y = renderDisclaimer(doc, y);
  }

  // Page numbers
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooter(doc, i, total);
  }

  const suffix = singleMethodFocus
    ? `-single-${optimizedMethodIds[0]}`
    : optimizedMethodIds.length > 0
      ? `-apexevolve-${optimizedMethodIds.length}methods`
      : '';
  const fileName = `apexguru-insight-report${suffix}-${Date.now()}.pdf`;
  doc.save(fileName);
  return fileName;
}
