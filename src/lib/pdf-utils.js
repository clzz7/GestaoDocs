import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

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

export function hasUsableText(text) {
  const nonWhitespace = text.replace(/\s/g, '').length;
  return nonWhitespace >= 12;
}

export async function getPdfPageCount(pdfBytes) {
  const doc = await PDFDocument.load(new Uint8Array(pdfBytes), { ignoreEncryption: true });
  return doc.getPageCount();
}

export async function extractPages(pdfBytes, pageIndices) {
  const srcDoc = await PDFDocument.load(new Uint8Array(pdfBytes), { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }
  return await newDoc.save();
}