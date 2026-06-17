import * as pdfjsLib from 'pdfjs-dist';

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