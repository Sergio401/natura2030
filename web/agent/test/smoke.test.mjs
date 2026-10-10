// Smoke test for the change executor state machine (agent/lib/machine.mjs).
// Run with: node --test agent/test/
//
// Builds a throwaway git "origin" bare repo, a prod clone and a dev worktree
// under the OS scratch dir (never the real repo), stubs the claude/pnpm/pm2
// binaries, and drives processOnce() in-process against them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

import { processOnce, generateSettings } from '../lib/machine.mjs';
import { createJob, setAction } from '../lib/store.mjs';
import { isAllowed } from '../lib/allowlist.mjs';

const SCRATCH_ROOT = process.env.AGENT_TEST_SCRATCH || path.join(os.tmpdir(), 'natura-agent-tests');

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'pipe', ...opts }).toString();
}

async function writeExecutable(filePath, content) {
  await fs.writeFile(filePath, content, 'utf8');
  await fs.chmod(filePath, 0o755);
  return filePath;
}

const CLAUDE_GOOD_SRC = [
  '#!/usr/bin/env node',
  "import { promises as fs } from 'node:fs';",
  "import path from 'node:path';",
  '',
  'const args = process.argv.slice(2);',
  "if (args.includes('--help')) {",
  // The worker probes `claude --help` once for a --max-turns flag; this
  // exercises the "flag present" branch.
  "  console.log('Usage: claude [options]\\n  --max-turns <n>  Limit agentic turns');",
  '  process.exit(0);',
  '}',
  '',
  "const target = path.join(process.cwd(), 'src/data/content.es.ts');",
  "const before = await fs.readFile(target, 'utf8');",
  "await fs.writeFile(target, before + '\\n// edited by fake claude\\n', 'utf8');",
  '',
  'const output = {',
  "  type: 'result',",
  "  subtype: 'success',",
  '  is_error: false,',
  "  result: 'Cambie el titular del hero en espanol. Actualice content.es.ts.',",
  "  session_id: 'fake-session-' + Date.now(),",
  '  num_turns: 3,',
  '  total_cost_usd: 0.01,',
  '};',
  'process.stdout.write(JSON.stringify(output));',
  'process.exit(0);',
  '',
].join('\n');

const CLAUDE_BAD_SRC = [
  '#!/usr/bin/env node',
  "import { promises as fs } from 'node:fs';",
  "import path from 'node:path';",
  '',
  'const args = process.argv.slice(2);',
  "if (args.includes('--help')) {",
  "  console.log('Usage: claude [options]\\n  --max-turns <n>  Limit agentic turns');",
  '  process.exit(0);',
  '}',
  '',
  // Creates a file outside the allowlist. Claude "succeeds" (is_error:false)
  // but the worker's post-run git-status allowlist check must still fail it.
  "const target = path.join(process.cwd(), 'src/pages/forbidden.txt');",
  "await fs.mkdir(path.dirname(target), { recursive: true });",
  "await fs.writeFile(target, 'no deberia existir\\n', 'utf8');",
  '',
  'const output = {',
  "  type: 'result',",
  "  subtype: 'success',",
  '  is_error: false,',
  "  result: 'Cree un archivo nuevo fuera de la lista permitida.',",
  "  session_id: 'fake-session-bad-' + Date.now(),",
  '  num_turns: 2,',
  '  total_cost_usd: 0.005,',
  '};',
  'process.stdout.write(JSON.stringify(output));',
  'process.exit(0);',
  '',
].join('\n');

// Reads the round prompt (-p), finds the staged upload path and references it
// from content.es.ts, and checks the reference copy is readable in the inbox.
const CLAUDE_USES_UPLOAD_SRC = [
  '#!/usr/bin/env node',
  "import { promises as fs } from 'node:fs';",
  "import path from 'node:path';",
  'const args = process.argv.slice(2);',
  "if (args.includes('--help')) { console.log('--max-turns'); process.exit(0); }",
  "const prompt = args[args.indexOf('-p') + 1];",
  "const upload = prompt.match(/para usarla en el sitio: (src\\/assets\\/uploads\\/[^)]+)\\)/)[1];",
  "const inbox = prompt.match(/: (\\.agent-inbox\\/foto\\.png)/)[1];",
  "await fs.access(path.join(process.cwd(), inbox));",
  "await fs.access(path.join(process.cwd(), '.agent-inbox/punto.yaml'));",
  "const target = path.join(process.cwd(), 'src/data/content.es.ts');",
  "await fs.appendFile(target, `\\n// imagen: ${upload.split('/').pop()}\\n`, 'utf8');",
  "process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: 'Use la foto.', session_id: 's-' + Date.now(), num_turns: 1, total_cost_usd: 0 }));",
  '',
].join('\n');

// Tries to add a language by widening the Locale union.
const CLAUDE_ADDS_LOCALE_SRC = [
  '#!/usr/bin/env node',
  "import { promises as fs } from 'node:fs';",
  "import path from 'node:path';",
  'const args = process.argv.slice(2);',
  "if (args.includes('--help')) { console.log('--max-turns'); process.exit(0); }",
  "const target = path.join(process.cwd(), 'src/data/types.ts');",
  "const before = await fs.readFile(target, 'utf8');",
  "await fs.writeFile(target, before.replace(\"'es' | 'en'\", \"'es' | 'en' | 'fr'\"), 'utf8');",
  "process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: 'Agregue frances.', session_id: 's-' + Date.now(), num_turns: 1, total_cost_usd: 0 }));",
  '',
].join('\n');

// Feedback round that edits a different file than the one importing the image.
const CLAUDE_EDITS_OTHER_SRC = [
  '#!/usr/bin/env node',
  "import { promises as fs } from 'node:fs';",
  "import path from 'node:path';",
  'const args = process.argv.slice(2);',
  "if (args.includes('--help')) { console.log('--max-turns'); process.exit(0); }",
  "await fs.writeFile(path.join(process.cwd(), 'src/data/otro.ts'), 'export const x = 1;\\n', 'utf8');",
  "process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: 'Ajuste.', session_id: 's-' + Date.now(), num_turns: 1, total_cost_usd: 0 }));",
  '',
].join('\n');

function pnpmStubSrc(logPath) {
  return [
    '#!/usr/bin/env node',
    "import { appendFileSync } from 'node:fs';",
    `const logPath = ${JSON.stringify(logPath)};`,
    "appendFileSync(logPath, `pnpm ${process.argv.slice(2).join(' ')} (cwd=${process.cwd()})\\n`);",
    'process.exit(0);',
    '',
  ].join('\n');
}

// Fails `pnpm check` the first `failTimes` times it's called (tracked via a
// counter file, since each invocation is a fresh process), always succeeds
// on `install`/`build` and on `check` after that. Used to exercise the
// verifying -> running(autofix) -> verifying loop.
function pnpmCheckFlakyStubSrc(logPath, counterPath, failTimes) {
  return [
    '#!/usr/bin/env node',
    "import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';",
    `const logPath = ${JSON.stringify(logPath)};`,
    `const counterPath = ${JSON.stringify(counterPath)};`,
    `const failTimes = ${JSON.stringify(failTimes)};`,
    'const args = process.argv.slice(2);',
    "appendFileSync(logPath, `pnpm ${args.join(' ')} (cwd=${process.cwd()})\\n`);",
    "if (args[0] === 'check') {",
    "  let n = existsSync(counterPath) ? Number(readFileSync(counterPath, 'utf8').trim()) || 0 : 0;",
    '  n += 1;',
    "  writeFileSync(counterPath, String(n), 'utf8');",
    '  if (n <= failTimes) {',
    "    process.stderr.write('fake pnpm check error (attempt ' + n + ')\\n');",
    '    process.exit(1);',
    '  }',
    '}',
    'process.exit(0);',
    '',
  ].join('\n');
}

function pm2StubSrc(logPath) {
  return [
    '#!/usr/bin/env node',
    "import { appendFileSync } from 'node:fs';",
    `const logPath = ${JSON.stringify(logPath)};`,
    "appendFileSync(logPath, `pm2 ${process.argv.slice(2).join(' ')} (cwd=${process.cwd()})\\n`);",
    'process.exit(0);',
    '',
  ].join('\n');
}

async function setupFixture() {
  const root = path.join(SCRATCH_ROOT, `agent-test-${Math.random().toString(16).slice(2)}`);
  const originDir = path.join(root, 'origin.git');
  const seedDir = path.join(root, 'seed');
  const prodDir = path.join(root, 'prod');
  const devDir = path.join(root, 'dev');
  const binDir = path.join(root, 'bin');
  const dataDir = path.join(root, 'data');

  await fs.mkdir(binDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(path.join(seedDir, 'web', 'src', 'data'), { recursive: true });

  await fs.writeFile(
    path.join(seedDir, 'web', 'src', 'data', 'content.es.ts'),
    "export const content = {\n  hero: { headline: 'Hola mundo' },\n};\n",
    'utf8',
  );
  await fs.writeFile(
    path.join(seedDir, 'web', 'src', 'data', 'types.ts'),
    "export type Locale = 'es' | 'en';\n",
    'utf8',
  );
  await fs.writeFile(path.join(seedDir, 'web', '.gitignore'), '.agent-inbox/\n', 'utf8');
  await fs.writeFile(
    path.join(seedDir, 'web', 'package.json'),
    JSON.stringify({ name: 'web-fixture', private: true }, null, 2) + '\n',
    'utf8',
  );

  sh('git', ['init', '--bare', '--initial-branch=main', originDir]);
  sh('git', ['init', '--initial-branch=main'], { cwd: seedDir });
  sh('git', ['-c', 'user.name=Seed', '-c', 'user.email=seed@test.local', 'add', '-A'], { cwd: seedDir });
  sh(
    'git',
    ['-c', 'user.name=Seed', '-c', 'user.email=seed@test.local', 'commit', '-m', 'seed content'],
    { cwd: seedDir },
  );
  sh('git', ['remote', 'add', 'origin', originDir], { cwd: seedDir });
  sh('git', ['push', 'origin', 'main'], { cwd: seedDir });

  sh('git', ['clone', originDir, prodDir]);
  sh('git', ['worktree', 'add', devDir, '-b', 'dev'], { cwd: prodDir });

  const claudeGood = await writeExecutable(path.join(binDir, 'claude-good.mjs'), CLAUDE_GOOD_SRC);
  const claudeBad = await writeExecutable(path.join(binDir, 'claude-bad.mjs'), CLAUDE_BAD_SRC);
  const claudeUpload = await writeExecutable(path.join(binDir, 'claude-upload.mjs'), CLAUDE_USES_UPLOAD_SRC);
  const claudeLocale = await writeExecutable(path.join(binDir, 'claude-locale.mjs'), CLAUDE_ADDS_LOCALE_SRC);
  const claudeOther = await writeExecutable(path.join(binDir, 'claude-other.mjs'), CLAUDE_EDITS_OTHER_SRC);
  const pnpmStub = await writeExecutable(
    path.join(binDir, 'pnpm-stub.mjs'),
    pnpmStubSrc(path.join(root, 'pnpm-calls.log')),
  );
  const pm2Stub = await writeExecutable(
    path.join(binDir, 'pm2-stub.mjs'),
    pm2StubSrc(path.join(root, 'pm2-calls.log')),
  );

  const baseConfig = {
    dataDir,
    prodDir,
    devDir,
    prodBranch: 'main',
    devBranch: 'dev',
    devUrl: 'http://dev.test.local',
    pm2Prod: 'natura',
    pm2Dev: 'natura-dev',
    claudeModel: 'sonnet',
    claudeTimeoutMs: 30000,
    maxFixRounds: 1,
    gitPush: true,
    pnpmBin: pnpmStub,
    pm2Bin: pm2Stub,
    pollIntervalMs: 3000,
  };
  baseConfig.settingsPath = await generateSettings(baseConfig);

  return { root, originDir, prodDir, devDir, dataDir, claudeGood, claudeBad, claudeUpload, claudeLocale, claudeOther, baseConfig };
}

async function createJobWithEnv(fx, input) {
  process.env.AGENT_DATA_DIR = fx.dataDir;
  return createJob({ summary: input.summary, instruction: input.instruction, requestedBy: 'admin', attachments: input.attachments });
}

async function setActionWithEnv(fx, jobId, action) {
  process.env.AGENT_DATA_DIR = fx.dataDir;
  return setAction(jobId, action);
}

test('queued job reaches preview with a dev commit, then approve publishes to prod with the same commit', async () => {
  const fx = await setupFixture();
  const config = { ...fx.baseConfig, claudeBin: fx.claudeGood };

  const job = await createJobWithEnv(fx, {
    summary: 'Cambiar el titular del hero',
    instruction: 'Actualiza src/data/content.es.ts para dar la bienvenida.',
  });
  assert.equal(job.status, 'queued');

  const preview = await processOnce(config);
  assert.ok(preview, 'processOnce should have picked up the open job');
  assert.equal(preview.id, job.id);
  assert.equal(preview.status, 'preview');
  assert.ok(preview.dev && preview.dev.commit, 'expected a dev commit to be recorded');
  assert.deepEqual(preview.changedFiles, ['src/data/content.es.ts']);
  assert.equal(preview.rounds.length, 1);
  assert.equal(preview.rounds[0].kind, 'initial');
  assert.equal(preview.rounds[0].ok, true);

  await setActionWithEnv(fx, job.id, { type: 'approve' });
  const done = await processOnce(config);
  assert.equal(done.status, 'done');
  assert.ok(done.prod && done.prod.commit);
  assert.equal(done.prod.commit, preview.dev.commit, 'prod commit should equal the dev commit (ff-only merge)');

  // Prod checkout actually has that commit as HEAD.
  const prodHead = sh('git', ['rev-parse', 'HEAD'], { cwd: fx.prodDir }).trim();
  assert.equal(prodHead, done.prod.commit);
});

test('a Claude round that creates a forbidden file fails the job and leaves the worktree clean', async () => {
  const fx = await setupFixture();
  const config = { ...fx.baseConfig, claudeBin: fx.claudeBad };

  const job = await createJobWithEnv(fx, {
    summary: 'Intento fuera de alcance',
    instruction: 'Pedido que empuja a Claude a tocar un archivo no permitido.',
  });

  const result = await processOnce(config);
  assert.equal(result.id, job.id);
  assert.equal(result.status, 'failed');
  assert.ok(result.error, 'expected an error message');
  assert.match(result.error, /forbidden\.txt/);

  const status = sh('git', ['status', '--porcelain'], { cwd: fx.devDir }).trim();
  assert.equal(status, '', 'dev worktree should be clean after a failed job');
});

test('discard resets the dev worktree and marks the job discarded', async () => {
  const fx = await setupFixture();
  const config = { ...fx.baseConfig, claudeBin: fx.claudeGood };

  const job = await createJobWithEnv(fx, {
    summary: 'Cambio a descartar',
    instruction: 'Actualiza el titular; se va a descartar despues.',
  });

  const preview = await processOnce(config);
  assert.equal(preview.status, 'preview');

  await setActionWithEnv(fx, job.id, { type: 'discard' });
  const discarded = await processOnce(config);
  assert.equal(discarded.id, job.id);
  assert.equal(discarded.status, 'discarded');
  assert.equal(discarded.action, null);

  const diff = sh('git', ['diff', 'origin/main', '--stat'], { cwd: fx.devDir }).trim();
  assert.equal(diff, '', 'dev worktree should match origin/main again after discard');

  const status = sh('git', ['status', '--porcelain'], { cwd: fx.devDir }).trim();
  assert.equal(status, '');
});

test('a check failure spends one autofix round and then reaches preview', async () => {
  const fx = await setupFixture();
  const counterPath = path.join(fx.root, 'check-counter.txt');
  const flakyPnpm = await writeExecutable(
    path.join(fx.root, 'bin', 'pnpm-flaky.mjs'),
    pnpmCheckFlakyStubSrc(path.join(fx.root, 'pnpm-calls.log'), counterPath, 1),
  );
  const config = { ...fx.baseConfig, claudeBin: fx.claudeGood, pnpmBin: flakyPnpm, maxFixRounds: 1 };

  const job = await createJobWithEnv(fx, {
    summary: 'Cambio que falla check una vez',
    instruction: 'Actualiza el titular; el check falla la primera vez.',
  });

  const result = await processOnce(config);
  assert.equal(result.id, job.id);
  assert.equal(result.status, 'preview');
  assert.equal(result.rounds.length, 2);
  assert.equal(result.rounds[0].kind, 'initial');
  assert.equal(result.rounds[1].kind, 'autofix');
  assert.equal(result.rounds[1].ok, true);
});

test('a check failure that never clears exhausts autofix rounds and fails', async () => {
  const fx = await setupFixture();
  const counterPath = path.join(fx.root, 'check-counter.txt');
  const alwaysFlakyPnpm = await writeExecutable(
    path.join(fx.root, 'bin', 'pnpm-always-flaky.mjs'),
    pnpmCheckFlakyStubSrc(path.join(fx.root, 'pnpm-calls.log'), counterPath, 999),
  );
  const config = { ...fx.baseConfig, claudeBin: fx.claudeGood, pnpmBin: alwaysFlakyPnpm, maxFixRounds: 1 };

  const job = await createJobWithEnv(fx, {
    summary: 'Cambio que nunca pasa check',
    instruction: 'Actualiza el titular; el check siempre falla.',
  });

  const result = await processOnce(config);
  assert.equal(result.id, job.id);
  assert.equal(result.status, 'failed');
  assert.equal(result.rounds.length, 2);
  assert.equal(result.rounds[0].kind, 'initial');
  assert.equal(result.rounds[1].kind, 'autofix');
  assert.match(result.error, /pnpm check/);

  const status = sh('git', ['status', '--porcelain'], { cwd: fx.devDir }).trim();
  assert.equal(status, '', 'dev worktree should be clean after exhausting autofix rounds');
});

test('allowlist: allowed areas accept new files, the deny list always wins', () => {
  const web = '/repo/web';
  for (const ok of [
    'src/data/content.es.ts',
    'src/data/platform-locations.ts',
    'src/assets/uploads/20261010-foto.webp',
    'src/assets/platform/nueva.jpg',
    'src/themes/v1-nature-distilled/Page.astro',
    'src/components/shared/Banner.astro',
    'src/features/platform/platform.css',
    'src/features/models/models/oleaje/model.py',
    'src/features/models/runtime/oleaje.worker.ts',
    'src/pages/models/oleaje/index.astro',
    'src/pages/models/en/oleaje/index.astro',
  ]) assert.equal(isAllowed(ok, web), true, ok);
  for (const no of [
    'package.json',
    'pnpm-lock.yaml',
    'astro.config.mjs',
    'tsconfig.json',
    '.env',
    'src/layouts/BaseLayout.astro',
    'src/pages/index.astro',
    'src/pages/fr/index.astro',
    'src/pages/api/admin/chat.ts',
    'src/pages/admin/index.astro',
    'src/lib/admin/policy.ts',
    'src/features/admin/AdminApp.tsx',
    'src/features/models/package.json',
    'agent/lib/allowlist.mjs',
    'deploy/update.sh',
    '.agent-inbox/foto.png',
    '../outside.ts',
    '/etc/passwd',
  ]) assert.equal(isAllowed(no, web), false, no);
});

test('attachments reach Claude; a used upload is committed, the inbox and unused uploads are not', async () => {
  const fx = await setupFixture();
  const config = { ...fx.baseConfig, claudeBin: fx.claudeUpload };
  const png = `data:image/png;base64,${Buffer.from('fake-png').toString('base64')}`;
  const shot = `data:image/png;base64,${Buffer.from('fake-screenshot').toString('base64')}`;
  const yaml = `data:text/yaml;base64,${Buffer.from('id: "004"\n').toString('base64')}`;

  const job = await createJobWithEnv(fx, {
    summary: 'Nueva foto en la landing',
    instruction: 'Usa foto.png en el hero; pantallazo.png es solo referencia.',
    attachments: [
      { name: 'Foto.PNG', type: 'image/png', data: png },
      { name: 'pantallazo.png', type: 'image/png', data: shot },
      { name: 'punto.yaml', type: 'text/yaml', data: yaml },
    ],
  });
  assert.deepEqual(job.attachments.map((a) => a.file), ['foto.png', 'pantallazo.png', 'punto.yaml']);

  const preview = await processOnce(config);
  assert.equal(preview.status, 'preview', preview.error ?? '');
  const committed = sh('git', ['show', '--name-only', '--format=', 'HEAD'], { cwd: fx.devDir }).trim().split('\n').sort();
  assert.equal(committed.length, 2, committed.join(', '));
  assert.ok(committed.includes('web/src/data/content.es.ts'));
  assert.ok(committed.some((file) => /^web\/src\/assets\/uploads\/\d{8}-foto\.png$/.test(file)));
  await assert.rejects(fs.access(path.join(fx.devDir, 'web', '.agent-inbox')));
});

test('rejects attachments of a type that is not allowed', async () => {
  const fx = await setupFixture();
  await assert.rejects(
    createJobWithEnv(fx, {
      summary: 'Archivo raro',
      instruction: 'x',
      attachments: [{ name: 'malo.svg', type: 'image/svg+xml', data: 'data:image/svg+xml;base64,PHN2Zy8+' }],
    }),
    /no está permitido/,
  );
});

test('a change that adds a language fails', async () => {
  const fx = await setupFixture();
  const config = { ...fx.baseConfig, claudeBin: fx.claudeLocale };
  await createJobWithEnv(fx, { summary: 'Agregar francés', instruction: 'Agrega el idioma francés.' });
  const result = await processOnce(config);
  assert.equal(result.status, 'failed');
  assert.match(result.error, /idiomas/);
  const status = sh('git', ['status', '--porcelain'], { cwd: fx.devDir }).trim();
  assert.equal(status, '');
});

test('a feedback round that edits another file keeps an image used in round 1', async () => {
  const fx = await setupFixture();
  const png = `data:image/png;base64,${Buffer.from('fake-png').toString('base64')}`;
  const yaml = `data:text/yaml;base64,${Buffer.from('id: "004"\n').toString('base64')}`;
  const job = await createJobWithEnv(fx, {
    summary: 'Foto y luego ajuste',
    instruction: 'Usa foto.png.',
    attachments: [
      { name: 'foto.png', type: 'image/png', data: png },
      { name: 'punto.yaml', type: 'text/yaml', data: yaml },
    ],
  });
  const preview = await processOnce({ ...fx.baseConfig, claudeBin: fx.claudeUpload });
  assert.equal(preview.status, 'preview', preview.error ?? '');

  await setActionWithEnv(fx, job.id, { type: 'feedback', instruction: 'Cambia otro texto.' });
  const again = await processOnce({ ...fx.baseConfig, claudeBin: fx.claudeOther });
  assert.equal(again.status, 'preview', again.error ?? '');
  const tree = sh('git', ['ls-tree', '-r', '--name-only', 'HEAD'], { cwd: fx.devDir });
  assert.match(tree, /web\/src\/assets\/uploads\/\d{8}-foto\.png/);
  assert.match(tree, /web\/src\/data\/otro\.ts/);
});
