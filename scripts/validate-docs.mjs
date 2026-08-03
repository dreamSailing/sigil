import fs from 'node:fs/promises';
import path from 'node:path';

const root = '/workspace';
const metadata = JSON.parse(await fs.readFile(path.join(root, 'metadata', 'contracts.json'), 'utf8'));
const readme = await fs.readFile(path.join(root, 'README.md'), 'utf8');
const quickstart = (await fs.readFile(path.join(root, 'docs', 'examples', 'quickstart-counter.tsx'), 'utf8')).trim();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractMarkedBlock(source, name) {
  const pattern = new RegExp(`<!-- ${name}:start -->[\\s\\S]*?\`\`\`tsx\\n([\\s\\S]*?)\\n\`\`\`[\\s\\S]*?<!-- ${name}:end -->`);
  const match = source.match(pattern);
  return match ? match[1].trim() : null;
}

const readmeQuickstart = extractMarkedBlock(readme, 'sigil-example:quickstart');
assert(readmeQuickstart, 'README quickstart example markers are missing.');
assert(readmeQuickstart === quickstart, 'README quickstart example drifted from docs/examples/quickstart-counter.tsx.');

const componentCount = metadata.uiComponents.length;
assert(readme.includes(`${componentCount} built-in components`), 'README English component count is out of date.');
assert(readme.includes(`${componentCount} 个组件`), 'README Chinese component count is out of date.');

for (const requiredFile of [
  'AI_GUIDE.md',
  'docs/AI_FRIENDLY_GAP_ANALYSIS.md',
  'docs/AI_FRIENDLY_ROADMAP.md',
  'docs/ERRORS.md',
  'docs/MIGRATION.md',
]) {
  try {
    await fs.access(path.join(root, requiredFile));
  } catch {
    throw new Error(`Required documentation file is missing: ${requiredFile}`);
  }
}

console.log('Documentation validation passed.');
