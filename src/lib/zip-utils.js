/**
 * zip-utils.js
 *
 * ZIP generation using fflate (ultra-fast, typed-array based).
 * Replaces zip.rs (generate_zip, generate_combined_zip, generate_fgts_zip).
 */
import { zipSync, strToU8 } from 'fflate';

/**
 * Sanitizes a name for use as a ZIP folder name.
 * Replaces invalid filesystem characters.
 */
function sanitizeForZip(name) {
  return name
    .replace(/[<>:"|?*\\]/g, '_')
    .replace(/[\/\r\n]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ensures unique folder names within a ZIP archive.
 * If two employees have the same name, appends " (2)", " (3)", etc.
 */
function uniqueFolderName(name, used) {
  const base = name.trim() || 'Funcionario';
  const count = (used.get(base) || 0) + 1;
  used.set(base, count);
  return count === 1 ? base : `${base} (${count})`;
}

/**
 * Generates a ZIP file from processed employee data.
 * Each employee gets a folder with their PDF named after the document type.
 *
 * @param {Array<{name: string, pdfBytes: Uint8Array}>} employees
 * @param {string} documentType - e.g. 'TRCT', 'SEGURO', 'FGTS'
 * @returns {Uint8Array} ZIP file bytes
 */
export function generateZip(employees, documentType) {
  const files = {};
  const usedFolders = new Map();

  for (const emp of employees) {
    const folder = uniqueFolderName(sanitizeForZip(emp.name), usedFolders);
    const fileName = `${folder}/${documentType}.pdf`;
    files[fileName] = emp.pdfBytes;
  }

  return zipSync(files, { level: 6 });
}

/**
 * Generates a combined ZIP file with TRCT.pdf and SEGURO.pdf per employee folder.
 *
 * @param {Array<{name: string, trctBytes?: Uint8Array, seguroBytes?: Uint8Array}>} employees
 * @returns {Uint8Array} ZIP file bytes
 */
export function generateCombinedZip(employees) {
  const files = {};
  const usedFolders = new Map();

  for (const emp of employees) {
    const folder = uniqueFolderName(sanitizeForZip(emp.name), usedFolders);

    if (emp.trctBytes) {
      files[`${folder}/TRCT.pdf`] = emp.trctBytes;
    }
    if (emp.seguroBytes) {
      files[`${folder}/SEGURO.pdf`] = emp.seguroBytes;
    }
  }

  return zipSync(files, { level: 6 });
}
