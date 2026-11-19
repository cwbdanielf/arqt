import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderImages } from '../../tools/readme-images.mjs';
import { REPO } from '../helpers.mjs';

test('imagens da página inicial estão em dia com os modelos (node tools/readme-images.mjs)', () => {
  for (const [f, content] of Object.entries(renderImages())) {
    const file = path.join(REPO, 'docs', 'img', f);
    assert.ok(fs.existsSync(file), `${f} ausente`);
    assert.equal(fs.readFileSync(file, 'utf8'), content, `${f} desatualizada — rode node tools/readme-images.mjs`);
  }
});

test('README: toda imagem e link local citado existe', () => {
  for (const readme of ['README.md', 'README.en.md']) {
    const text = fs.readFileSync(path.join(REPO, readme), 'utf8');
    const refs = [...text.matchAll(/(?:src|srcset|href)="([^"#:]+)"|\]\(([^)#:]+)\)/g)].map((m) => m[1] || m[2]);
    assert.ok(refs.length > 10, readme);
    for (const r of refs) assert.ok(fs.existsSync(path.join(REPO, r)), `${readme}: ${r} não existe`);
  }
});
