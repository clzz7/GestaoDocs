function sanitizeFolderName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}
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
export function parseFgtsTxt(content) {
  const separator = '-------------------------------------------------------------------------';
  const blocks = content.split(separator);
  const employees = [];
  for (let blockIdx = 1; blockIdx < blocks.length; blockIdx++) {
    const block = blocks[blockIdx];
    const trimmed = block.trim();
    if (!trimmed || !trimmed.includes('NOME DO TRABALHADOR')) continue;
    let lines = block.split('\n').map((l) => l.trimEnd());
    while (lines.length > 0 && lines[0].trim() === '') lines.shift();
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
    const name = (() => {
      const raw = extractFgtsName(lines);
      return raw ? sanitizeFolderName(raw) : `Funcionario_${employees.length + 1}`;
    })();
    const previous = employees.length > 0 ? employees[employees.length - 1] : null;
    if (previous && previous.name === name) {
      previous.lines.push('', ...lines);
    } else {
      employees.push({ name, lines });
    }
  }
  return employees;
}