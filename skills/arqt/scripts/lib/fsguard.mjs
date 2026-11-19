// Escrita restrita a diretórios autorizados, atômica, sem seguir symlinks.
import fs from 'node:fs';
import path from 'node:path';

export class FsGuard {
  constructor(root, allowedDirs) {
    this.root = fs.realpathSync(root);
    this.allowed = allowedDirs.map((d) => path.resolve(this.root, d));
  }

  #check(target) {
    const abs = path.resolve(this.root, target);
    const ok = this.allowed.some((dir) => abs === dir || abs.startsWith(dir + path.sep));
    if (!ok) throw new Error(`escrita recusada fora das pastas autorizadas: ${path.relative(this.root, abs)}`);
    // Nenhum componente do caminho (a partir da raiz) pode ser symlink/junction.
    let cur = this.root;
    for (const seg of path.relative(this.root, abs).split(path.sep)) {
      cur = path.join(cur, seg);
      if (!fs.existsSync(cur)) break;
      if (fs.lstatSync(cur).isSymbolicLink()) throw new Error(`escrita recusada: ${path.relative(this.root, cur)} é um link simbólico`);
    }
    return abs;
  }

  mkdir(dir) {
    const abs = this.#check(dir);
    fs.mkdirSync(abs, { recursive: true });
    this.#check(dir); // revalida após criar
    return abs;
  }

  write(file, content) {
    const abs = this.#check(file);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    this.#check(file);
    const tmp = `${abs}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, content);
    fs.renameSync(tmp, abs);
    return abs;
  }

  remove(file) {
    const abs = this.#check(file);
    if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
  }

  list(dir) {
    const abs = this.#check(dir);
    return fs.existsSync(abs) ? fs.readdirSync(abs) : [];
  }
}
