import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set([
  '.git',
  'dist',
  'node_modules',
  'migrated_prompt_history',
]);
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);

const cp1252MojibakeTail = '\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u201a-\u201e\u2020-\u2022\u2030\u2039\u203a\u20ac\u2122';
const mojibakePattern = new RegExp(
  `(?:\\u00c3[${cp1252MojibakeTail}]|\\u00c2[\\u0080-\\u00bf]|\\u00e2[${cp1252MojibakeTail}]|\\ufffd)`,
  'u',
);
const replacementQuestionPattern = /(?:[A-Za-zÀ-ÿ]\?{1,2}[A-Za-zÀ-ÿ]|[A-Za-zÀ-ÿ]\?{2}|[Nn]\?o|[Jj]\?|est\?|n\?mero|vers\?o|cota\?\?o|Pre\?os|T\?cnica)/u;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walk(fullPath));
      }
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const failures = [];
const questionReplacementFiles = new Set([
  'App.tsx',
  'pages/CRM.tsx',
  'services/crmRepository.ts',
]);

for (const file of walk(root)) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const relativeFile = path.relative(root, file).replaceAll(path.sep, '/');
  const checkQuestionReplacement = questionReplacementFiles.has(relativeFile);

  lines.forEach((line, index) => {
    if (mojibakePattern.test(line) || (checkQuestionReplacement && replacementQuestionPattern.test(line))) {
      failures.push({
        file: relativeFile,
        line: index + 1,
        text: line.trim(),
      });
    }
  });
}

if (failures.length > 0) {
  console.error('Poss\u00edveis textos com encoding corrompido encontrados:');
  for (const failure of failures) {
    console.error(`${failure.file}:${failure.line} ${failure.text}`);
  }
  process.exit(1);
}

console.log('Encoding OK: nenhum mojibake encontrado nos arquivos fonte.');
