/**
 * pdf-utils.js
 *
 * PDF utilities using pdf.js (reading/text extraction) and pdf-lib (manipulation/writing).
 * Replaces organize_pdf.rs and the PDF manipulation parts of process_trct.rs.
 */
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/**
 * Extracts text from all pages of a PDF.
 * @param {Uint8Array} pdfBytes - Raw PDF bytes.
 * @returns {Promise<string[]>} Array of text strings, one per page (0-indexed).
 */
export async function extractTextFromPdf(pdfBytes) {
  const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
  const texts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');
    texts.push(text);
  }
  return texts;
}

/**
 * Checks if a page's extracted text is "usable" (has enough content to skip OCR).
 * Matches the original Rust `has_usable_text` logic.
 * @param {string} text - Extracted text from a page.
 * @returns {boolean}
 */
export function hasUsableText(text) {
  const nonWhitespace = text.replace(/\s/g, '').length;
  return nonWhitespace >= 12;
}

/**
 * Returns the number of pages in a PDF.
 * @param {Uint8Array} pdfBytes - Raw PDF bytes.
 * @returns {Promise<number>}
 */
export async function getPdfPageCount(pdfBytes) {
  const doc = await PDFDocument.load(new Uint8Array(pdfBytes), { ignoreEncryption: true });
  return doc.getPageCount();
}

/**
 * Extracts specific pages from a PDF into a new PDF document.
 * @param {Uint8Array} pdfBytes - Source PDF bytes.
 * @param {number[]} pageIndices - 0-based page indices to extract.
 * @returns {Promise<Uint8Array>} New PDF containing only the specified pages.
 */
export async function extractPages(pdfBytes, pageIndices) {
  const srcDoc = await PDFDocument.load(new Uint8Array(pdfBytes), { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }
  return await newDoc.save();
}

/**
 * Reorganizes pages from one or more source PDFs into a new output PDF.
 * Pages can be reordered, removed, combined from multiple PDFs, and rotated.
 *
 * @param {Array<{pdfBytes: Uint8Array, pageNumber: number, rotation: number}>} pageSources
 *   Each entry specifies the source PDF bytes, a 1-based page number, and clockwise rotation in degrees.
 * @returns {Promise<Uint8Array>} The reorganized PDF bytes.
 */
export async function reorganizePages(pageSources) {
  const newDoc = await PDFDocument.create();
  const pdfCache = new Map();

  for (const source of pageSources) {
    let srcDoc = pdfCache.get(source.pdfBytes);
    if (!srcDoc) {
      srcDoc = await PDFDocument.load(new Uint8Array(source.pdfBytes), { ignoreEncryption: true });
      pdfCache.set(source.pdfBytes, srcDoc);
    }

    const pageIndex = source.pageNumber - 1;
    const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);

    if (source.rotation && source.rotation !== 0) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees(currentRotation + source.rotation));
    }

    newDoc.addPage(copiedPage);
  }

  return await newDoc.save();
}

/**
 * Renders a single page of a PDF as a thumbnail image data URL.
 * @param {Uint8Array} pdfBytes - Raw PDF bytes.
 * @param {number} pageNumber - 1-based page number.
 * @param {number} [scale=0.4] - Rendering scale.
 * @param {number} [rotation=0] - Rotation in degrees.
 * @returns {Promise<string|null>} Data URL (image/png) or null on error.
 */
export async function renderPageThumbnail(pdfBytes, pageNumber, scale = 0.4, rotation = 0) {
  try {
    const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale, rotation });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Thumbnail render error:', e);
    return null;
  }
}
