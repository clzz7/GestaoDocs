function sanitizeFolderName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}
function extractNameFromTrct(text) {
  const re1 = /11\s*Nome[\s\n\r]*(?:[\d.\-]+[\s\n\r]+)?([A-Za-z\s]+?)(?:[\s\n\r]+\d{2}\s|$)/i;
  const m1 = re1.exec(text);
  if (m1) {
    const name = m1[1].split('  ')[0].trim();
    if (name) return name;
  }
  const re2 = /11\s*Nome[\s\n\r]+([A-Za-z\s]+)/i;
  const m2 = re2.exec(text);
  if (m2) {
    const name = m2[1].split('  ')[0].trim();
    if (name) return name;
  }
  return null;
}
export function processTrct(pageTexts) {
  const totalPages = pageTexts.length;
  const trctStarts = [];
  for (let i = 0; i < totalPages; i++) {
    const text = pageTexts[i];
    if (text.includes('TERMO DE RESCIS') && !text.includes('HOMOLOGA')) {
      trctStarts.push({ pageIndex: i, text });
    }
  }
  const employees = [];
  for (let idx = 0; idx < trctStarts.length; idx++) {
    const startPage = trctStarts[idx].pageIndex;
    const endPage = idx + 1 < trctStarts.length ? trctStarts[idx + 1].pageIndex - 1 : totalPages - 1;
    const pageIndices = [];
    for (let p = startPage; p <= endPage; p++) { pageIndices.push(p); }
    const rawName = extractNameFromTrct(trctStarts[idx].text);
    const name = rawName ? sanitizeFolderName(rawName) : 'Funcionario_' + (idx + 1);
    employees.push({ index: idx + 1, name, pageIndices, pageCount: pageIndices.length });
  }
  return { employees, totalPages };
}