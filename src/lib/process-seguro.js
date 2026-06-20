/**
 * process-seguro.js
 *
 * Seguro PDF processing logic, ported from process_seguro.rs.
 * Pairs pages i and i+N/2 as belonging to the same employee.
 */

function sanitizeFolderName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Extracts the employee name from a Seguro page text.
 * Pattern: "2 [name] NOME"
 * @param {string} text - Page text content.
 * @returns {string|null} Employee name or null.
 */
function extractNameFromSeguro(text) {
  const re = /2[\s\n\r]+([A-Za-zÀ-ÿ\s]+?)[\s\n\r]+NOME/;
  const m = re.exec(text);
  if (m) {
    const name = m[1].trim();
    if (name) return name;
  }
  return null;
}

/**
 * Processes a Seguro PDF: pages i and i+N/2 belong to the same employee.
 *
 * @param {string[]} pageTexts - Text content of each page (0-indexed).
 * @returns {{employees: Array<{name: string, pageIndices: number[]}>, totalPages: number}}
 */
export function processSeguro(pageTexts) {
  const totalPages = pageTexts.length;
  const half = Math.floor(totalPages / 2);

  const employees = [];

  for (let i = 0; i < half; i++) {
    const page1 = i;
    const page2 = i + half;

    const rawName = extractNameFromSeguro(pageTexts[page1]);
    const name = rawName
      ? sanitizeFolderName(rawName)
      : `Funcionario_${i + 1}`;

    employees.push({
      index: i + 1,
      name,
      pageIndices: [page1, page2],
      pageCount: 2,
    });
  }

  return { employees, totalPages };
}
