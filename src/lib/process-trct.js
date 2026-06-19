/**
 * process-trct.js
 *
 * Lógica de processamento de TRCT (Termo de Rescisão do Contrato de Trabalho).
 * Identifica seções de funcionários por detecção de cabeçalho,
 * extrai nomes dos funcionários e agrupa as páginas por funcionário.
 */

/**
 * Sanitiza o nome do funcionário para uso seguro em pastas do sistema operacional.
 * Remove caracteres inválidos e converte para maiúsculas.
 */
function sanitizeFolderName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Extrai o nome do funcionário a partir do texto extraído da página de TRCT.
 * Suporta caracteres acentuados comuns em nomes em português.
 * @param {string} text - Conteúdo em texto da página.
 * @returns {string|null} Nome do funcionário ou null se não encontrado.
 */
function extractNameFromTrct(text) {
  const re1 = /11\s*Nome[\s\n\r]*(?:[\d.\-]+[\s\n\r]+)?([A-Za-zÀ-ÿ\s]+?)(?:[\s\n\r]+\d{2}\s|$)/i;
  const m1 = re1.exec(text);
  if (m1) {
    const name = m1[1].split('  ')[0].trim();
    if (name) return name;
  }
  const re2 = /11\s*Nome[\s\n\r]+([A-Za-zÀ-ÿ\s]+)/i;
  const m2 = re2.exec(text);
  if (m2) {
    const name = m2[1].split('  ')[0].trim();
    if (name) return name;
  }

  return null;
}

/**
 * Processa um PDF de TRCT identificando os limites de cada funcionário por cabeçalho.
 *
 * @param {string[]} pageTexts - Array com o texto extraído de cada página (0-indexed).
 * @returns {{employees: Array<{name: string, pageIndices: number[], pageCount: number, index: number}>, totalPages: number}}
 */
export function processTrct(pageTexts) {
  const totalPages = pageTexts.length;
  const trctStarts = [];
  for (let i = 0; i < totalPages; i++) {
    const text = pageTexts[i] || '';
    if (text.includes('TERMO DE RESCISÃO DO CONTRATO DE TRABALHO') || text.includes('TERMO DE RESCISAO DO CONTRATO DE TRABALHO')) {
      trctStarts.push({ pageIndex: i, text });
    }
  }

  const employees = [];
  for (let idx = 0; idx < trctStarts.length; idx++) {
    const startPage = trctStarts[idx].pageIndex;
    const endPage = idx + 1 < trctStarts.length
      ? trctStarts[idx + 1].pageIndex - 1
      : totalPages - 1;

    const pageIndices = [];
    for (let p = startPage; p <= endPage; p++) {
      pageIndices.push(p);
    }

    const rawName = extractNameFromTrct(trctStarts[idx].text);
    const name = rawName
      ? sanitizeFolderName(rawName)
      : `Funcionario_${idx + 1}`;

    employees.push({
      index: idx + 1,
      name,
      pageIndices,
      pageCount: pageIndices.length,
    });
  }

  return { employees, totalPages };
}
