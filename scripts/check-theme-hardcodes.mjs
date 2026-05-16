import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scannedRoots = ['App.tsx', 'components', 'pages', 'utils'];

const ignoredPaths = new Set([
  'components/ProposalPrint.tsx',
  'utils/lubitSaasProposal.ts'
]);

const ignoredPrefixes = [
  'components/proposals/',
  'dist/',
  'node_modules/',
  'migrated_prompt_history/'
];

const forbidden = [
  {
    name: 'neutral/cool background',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*bg-(?:slate|blue|indigo|sky|violet|cyan|purple)-\d+(?:\/\d+)?/
  },
  {
    name: 'neutral/cool border',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*border-(?:slate|blue|indigo|sky|violet|cyan|purple)-\d+(?:\/\d+)?/
  },
  {
    name: 'neutral/cool divide',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*divide-(?:slate|blue|indigo|sky|violet|cyan|purple)-\d+/
  },
  {
    name: 'neutral/cool ring',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*ring-(?:slate|blue|indigo|sky|violet|cyan|purple)-\d+(?:\/\d+)?/
  },
  {
    name: 'neutral/cool shadow',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*shadow-(?:slate|blue|indigo|sky|violet|cyan|purple)-\d+(?:\/\d+)?/
  },
  {
    name: 'cool identity text',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*text-(?:blue|indigo|sky|violet|cyan|purple)-\d+/
  },
  {
    name: 'cool gradient',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*(?:from|via|to)-(?:blue|indigo|sky|violet|cyan|purple)-\d+/
  },
  {
    name: 'fixed white surface',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*bg-white(?:\/\d+)?/
  },
  {
    name: 'fixed black overlay',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*bg-black(?:\/\d+)?/
  },
  {
    name: 'fixed hex visual class',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*(?:bg|border|text|ring)-\[#(?:0f172a|1e293b|111827|101621|2563eb)\]/i
  },
  {
    name: 'large radius',
    pattern: /(?:^|\s)(?:[a-z0-9-]+:)*rounded-(?:2xl|3xl)|(?:^|\s)(?:[a-z0-9-]+:)*rounded-t-2xl/
  }
];

const isIgnoredPath = relativePath =>
  ignoredPaths.has(relativePath) || ignoredPrefixes.some(prefix => relativePath.startsWith(prefix));

const shouldIgnoreLine = line => {
  const normalized = line.trim();
  if (!normalized) return true;
  if (normalized.includes('print:') || normalized.includes('hidden print:block')) return true;
  return false;
};

const collectFiles = target => {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) return [];
  const stat = fs.statSync(full);
  if (stat.isFile()) return [target.replace(/\\/g, '/')];

  const files = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryFull = path.join(dir, entry.name);
      const relative = path.relative(root, entryFull).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (isIgnoredPath(`${relative}/`)) continue;
        walk(entryFull);
      } else if (/\.(tsx|ts)$/.test(entry.name) && !isIgnoredPath(relative)) {
        files.push(relative);
      }
    }
  };
  walk(full);
  return files;
};

const files = [...new Set(scannedRoots.flatMap(collectFiles))].filter(file => !isIgnoredPath(file));
const findings = [];

for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    if (shouldIgnoreLine(line)) return;
    for (const rule of forbidden) {
      if (rule.pattern.test(line)) {
        findings.push({ file, line: index + 1, rule: rule.name, text: line.trim() });
      }
    }
  });
}

if (findings.length > 0) {
  console.error(`Theme hardcode audit failed: ${findings.length} forbidden visual hardcode(s) found.\n`);
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.rule}] ${finding.text}`);
  }
  process.exit(1);
}

console.log(`Theme hardcode audit passed (${files.length} files scanned).`);
