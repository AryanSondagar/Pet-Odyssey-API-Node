const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { test } = require('node:test');

test('documents every environment key declared by the validated schema', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const schema = fs.readFileSync(path.join(projectRoot, 'src/config/env.js'), 'utf8');
  const example = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf8');
  const schemaKeys = [...schema.matchAll(/^\s{2}([A-Z][A-Z0-9_]*):/gm)].map((match) => match[1]);
  const exampleKeys = new Set([...example.matchAll(/^\s*#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]));

  assert.ok(schemaKeys.length > 0, 'environment schema keys were found');
  assert.deepEqual(schemaKeys.filter((key) => !exampleKeys.has(key)), []);
});

test('rejects an invalid PORT during environment parsing', () => {
  const result = spawnSync(
    process.execPath,
    ['-e', "require('./src/config/env')"],
    {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PORT: 'not-a-port' },
      encoding: 'utf8',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid environment configuration: PORT/);
});
