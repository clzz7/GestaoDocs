import { zipSync } from 'fflate';

function sanitizeForZip(name) {
  return name.replace(/[<>:"|?*\\]/g, '_').replace(/[\/\r\n]+/g, '_').replace(/\s+/g, ' ').trim();
}
function uniqueFolderName(name, used) {
  const base = name.trim() || 'Funcionario';
  const count = (used.get(base) || 0) + 1;
  used.set(base, count);
  return count === 1 ? base : base + ' (' + count + ')';
}
export function generateZip(employees, documentType) {
  const files = {};
  const usedFolders = new Map();
  for (const emp of employees) {
    const folder = uniqueFolderName(sanitizeForZip(emp.name), usedFolders);
    const fileName = folder + '/' + documentType + '.pdf';
    files[fileName] = emp.pdfBytes;
  }
  return zipSync(files, { level: 6 });
}