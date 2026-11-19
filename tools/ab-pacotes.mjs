// Dev: monta os pacotes do teste A/B cego (docs/ab/rubrica.md).
// Uso: node tools/ab-pacotes.mjs <pasta-A> <pasta-B> <saída>
//   <pasta-A>/<repo>.md  documento do Claude sem o skill
//   <pasta-B>/<repo>.md  .arqt/docs/arquitetura.md do mesmo repositório
// Grava <saída>/<repo>/Doc 1.md e Doc 2.md (ordem sorteada), a ficha do avaliador e <saída>/chave.json
// (quem é quem — fica só com quem organiza; não distribuir).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Linhas que denunciam a origem (assinaturas de ferramenta/modelo) saem do documento.
const SIGNATURE = /\barqt\b|\bclaude\b|\banthropic\b|gerad[oa] (?:pelo|por|com)|generated (?:by|with)/i;

export function anonymize(text) {
  return text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => !SIGNATURE.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// rnd(): 0 ou 1. Devolve { 'Doc 1': 'A'|'B', 'Doc 2': … }
export function assign(rnd = () => crypto.randomInt(2)) {
  return rnd() === 0 ? { 'Doc 1': 'A', 'Doc 2': 'B' } : { 'Doc 1': 'B', 'Doc 2': 'A' };
}

function ficha(repo) {
  return `# Ficha do avaliador — ${repo}\n\nSiga o roteiro e a rúbrica de docs/ab/rubrica.md.\n\n` +
    '- Código do avaliador (A1, A2…):\n- Li primeiro: Doc 1 / Doc 2\n\n' +
    '| | Doc 1 | Doc 2 |\n|---|---|---|\n| Precisão (1–5) | | |\n| Clareza (1–5) | | |\n| Utilidade (1–5) | | |\n' +
    '| Tempo para entender (1–5) | | |\n| Minutos nas tarefas | | |\n| Tarefas certas (de 3) | | |\n| Afirmações certas (de 3) | | |\n\n' +
    '- Entregaria a um colega novo: Doc 1 / Doc 2 / tanto faz\n- Levaria à diretoria: Doc 1 / Doc 2 / tanto faz\n' +
    '- Para a operação: Doc 1 / Doc 2 / tanto faz\n- Acho que sei a origem de cada um: não / sim (qual)\n- Comentários:\n';
}

export function buildPackages(dirA, dirB, out, rnd) {
  const repos = fs.readdirSync(dirB).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
  const missing = repos.filter((r) => !fs.existsSync(path.join(dirA, r + '.md')));
  if (!repos.length || missing.length) throw new Error(`faltam documentos A/B: ${missing.join(', ') || 'nenhum .md em ' + dirB}`);
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`a pasta de saída não está vazia: ${out}`);
  const key = {};
  for (const repo of repos) {
    const map = assign(rnd);
    key[repo] = map;
    const dir = path.join(out, repo);
    fs.mkdirSync(dir, { recursive: true });
    for (const [doc, src] of Object.entries(map)) {
      fs.writeFileSync(path.join(dir, `${doc}.md`), anonymize(fs.readFileSync(path.join(src === 'A' ? dirA : dirB, repo + '.md'), 'utf8')));
    }
    fs.writeFileSync(path.join(dir, 'ficha.md'), ficha(repo));
  }
  fs.writeFileSync(path.join(out, 'chave.json'), JSON.stringify(key, null, 2) + '\n');
  return key;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dirA, dirB, out] = process.argv.slice(2);
  if (!dirA || !dirB || !out) { console.error('uso: node tools/ab-pacotes.mjs <pasta-A> <pasta-B> <saída>'); process.exit(4); }
  try {
    const key = buildPackages(dirA, dirB, out);
    console.log(`✓ ${Object.keys(key).length} pacotes em ${out} (chave.json: não distribuir)`);
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}
