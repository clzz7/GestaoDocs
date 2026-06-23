/**
 * process-fgts.js
 *
 * FGTS analytical extract TXT processing and PDF generation.
 * Ported from process_fgts.rs. Replaces Typst with jsPDF for PDF generation.
 */
import { jsPDF } from 'jspdf';

function sanitizeFolderName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Extracts the employee name from the FGTS block lines.
 * Looks for "NOME DO TRABALHADOR" header and reads the next non-empty line.
 * @param {string[]} lines
 * @returns {string|null}
 */
function extractFgtsName(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('NOME DO TRABALHADOR')) {
      if (i + 1 < lines.length) {
        const nameLine = lines[i + 1].trim();
        if (nameLine) {
          const name = nameLine.split('  ')[0].trim();
          if (name) return name;
        }
      }
    }
  }
  return null;
}

/**
 * Parses the FGTS analytical extract TXT file into individual employee blocks.
 * @param {string} content - Full TXT file content.
 * @returns {Array<{name: string, lines: string[]}>}
 */
export function parseFgtsTxt(content) {
  const separator = '-------------------------------------------------------------------------';
  const blocks = content.split(separator);
  const employees = [];
  for (let blockIdx = 1; blockIdx < blocks.length; blockIdx++) {
    const block = blocks[blockIdx];
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (!trimmed.includes('NOME DO TRABALHADOR')) continue;

    let lines = block.split('\n').map((l) => l.trimEnd());
    while (lines.length > 0 && lines[0].trim() === '') lines.shift();
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
    if (blockIdx === blocks.length - 1) {
      while (
        lines.length > 0 &&
        /^\d+$/.test(lines[lines.length - 1].trim())
      ) {
        lines.pop();
      }
    }
    const name =
      (() => {
        const raw = extractFgtsName(lines);
        return raw ? sanitizeFolderName(raw) : `Funcionario_${employees.length + 1}`;
      })();
    const previous = employees.length > 0 ? employees[employees.length - 1] : null;
    if (previous && previous.name === name) {
      previous.lines.push('');
      previous.lines.push(...lines);
    } else {
      employees.push({ name, lines });
    }
  }

  return employees;
}

/**
 * Generates a PDF document from text lines, mimicking the Caixa FGTS extract layout.
 * Uses jsPDF with Courier font for monospace rendering (replaces Typst).
 *
 * @param {string[]} lines - Lines of text to render.
 * @returns {Uint8Array} PDF bytes.
 */
export function generateFgtsPdf(lines) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    compress: true,
  });

  const marginLeft = 30;
  const marginRight = 70;
  const marginTop = 80;
  const marginBottom = 80;
  const fontSize = 10;
  const lineHeight = fontSize * 1.6;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableHeight = pageHeight - marginTop - marginBottom;
  const maxLinesPerPage = Math.floor(usableHeight / lineHeight);

  doc.setFont('Courier', 'normal');
  doc.setFontSize(fontSize);

  let currentLine = 0;
  let y = marginTop + fontSize;

  for (let i = 0; i < lines.length; i++) {
    if (currentLine >= maxLinesPerPage) {
      doc.addPage();
      currentLine = 0;
      y = marginTop + fontSize;
    }

    doc.text(lines[i], marginLeft, y);
    y += lineHeight;
    currentLine++;
  }
  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
