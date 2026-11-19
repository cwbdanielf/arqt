// Dev: regenera skills/arqt/CHECKSUMS.txt (SHA-256 com LF normalizado).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir = path.resolve('skills/arqt');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name !== 'CHECKSUMS.txt') files.push(p);
  }
})(dir);
const lines = files.map((f) => {
  const c = fs.readFileSync(f).toString('utf8').replace(/\r\n/g, '\n');
  return `${crypto.createHash('sha256').update(c).digest('hex')}  ${path.relative(dir, f).split(path.sep).join('/')}`;
});
fs.writeFileSync(path.join(dir, 'CHECKSUMS.txt'), `# arqT — SHA-256 dos arquivos do skill (LF)\n${lines.join('\n')}\n`);
console.log(`CHECKSUMS.txt: ${lines.length} arquivos`);
