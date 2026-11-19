import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SKILL = path.join(REPO, 'skills', 'arqt');
export const BUILD = path.join(SKILL, 'scripts', 'build.mjs');
export const loja = () => JSON.parse(fs.readFileSync(path.join(REPO, 'tests', 'models', 'loja.json'), 'utf8'));

// Copia o projeto de exemplo (sem saídas anteriores) para uma pasta temporária, com o modelo dado.
export function lojaProject(model = loja()) {
  const src = path.join(REPO, 'tests', 'projects', 'loja');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arqt-loja-'));
  fs.cpSync(src, dir, { recursive: true, filter: (s) => !s.split(path.sep).includes('.arqt') });
  fs.mkdirSync(path.join(dir, '.arqt'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.arqt', 'model.json'), JSON.stringify(model, null, 2));
  return dir;
}
