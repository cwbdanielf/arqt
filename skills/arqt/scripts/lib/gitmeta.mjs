// Lê commit e branch de .git como arquivos (sem executar git).
import fs from 'node:fs';
import path from 'node:path';

const read = (p) => {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
};

export function gitMeta(root) {
  let gitDir = path.join(root, '.git');
  try {
    if (fs.statSync(gitDir).isFile()) {
      const m = /^gitdir:\s*(.+)$/m.exec(read(gitDir) || '');
      if (!m) return {};
      gitDir = path.resolve(root, m[1].trim());
    }
  } catch { return {}; }
  const head = (read(path.join(gitDir, 'HEAD')) || '').trim();
  if (!head) return {};
  if (/^[0-9a-f]{40,64}$/.test(head)) return { commit: head.slice(0, 12) };
  const ref = /^ref:\s*(refs\/[\w./-]+)$/.exec(head)?.[1];
  if (!ref || ref.includes('..')) return {};
  const branch = ref.replace(/^refs\/heads\//, '');
  let sha = (read(path.join(gitDir, ...ref.split('/'))) || '').trim();
  if (!/^[0-9a-f]{40,64}$/.test(sha)) {
    // worktrees guardam refs no diretório comum
    const common = (read(path.join(gitDir, 'commondir')) || '').trim();
    const base = common ? path.resolve(gitDir, common) : gitDir;
    sha = (read(path.join(base, ...ref.split('/'))) || '').trim();
    if (!/^[0-9a-f]{40,64}$/.test(sha)) {
      const packed = read(path.join(base, 'packed-refs')) || '';
      sha = packed.split('\n').map((l) => l.split(' ')).find(([, r]) => r === ref)?.[0] || '';
    }
  }
  return /^[0-9a-f]{40,64}$/.test(sha) ? { commit: sha.slice(0, 12), branch } : { branch };
}
