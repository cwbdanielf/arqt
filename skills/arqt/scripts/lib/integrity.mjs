// Verificação de CHECKSUMS.txt do próprio skill (SHA-256, formato "hash  caminho").
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function verifyChecksums(skillDir) {
  const file = path.join(skillDir, 'CHECKSUMS.txt');
  if (!fs.existsSync(file)) return { ok: false, problems: ['CHECKSUMS.txt ausente'] };
  const problems = [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#'));
  for (const line of lines) {
    const m = /^([0-9a-f]{64})\s+(.+)$/.exec(line);
    if (!m) { problems.push(`linha inválida: ${line.slice(0, 60)}`); continue; }
    const rel = m[2].trim();
    if (rel.includes('..')) { problems.push(`caminho inválido: ${rel}`); continue; }
    const abs = path.join(skillDir, ...rel.split('/'));
    if (!fs.existsSync(abs)) { problems.push(`arquivo ausente: ${rel}`); continue; }
    // normaliza CRLF → LF (checkouts no Windows) antes do hash
    const content = fs.readFileSync(abs).toString('utf8').replace(/\r\n/g, '\n');
    if (sha256(content) !== m[1]) problems.push(`arquivo alterado: ${rel}`);
  }
  return { ok: problems.length === 0, problems, count: lines.length };
}
