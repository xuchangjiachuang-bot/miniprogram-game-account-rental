// Exercise configuration guards with in-memory adapters; never connect to services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relative, env, mocks) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const parsed = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true);
  assert.equal(parsed.parseDiagnostics.length, 0, `${relative}: TypeScript parse failed`);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const exports = {};
  const logs = [];
  vm.runInNewContext(outputText, {
    exports,
    process: { env },
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
    console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) },
  });
  return { exports, logs };
}

function dbMocks(calls) {
  const postgres = (url) => { calls.push(url); return {}; };
  return {
    postgres,
    'drizzle-orm/postgres-js': { drizzle: () => ({}) },
    './init-admin': {}, './init-agreements': {}, './init-search-content': {},
    './init-finance-audit': {}, './init-order-consumption': {}, './init-user-balance': {},
    './ensure-schema-compatibility': {},
    '../storage/database/smsConfigManager': {},
    '../storage/database/shared/admin-schema': {},
    '../storage/database/shared/schema': {},
  };
}

async function main() {
  let checks = 0;
  for (const file of ['src/lib/db.ts', 'src/lib/init-user-balance.ts']) {
    const calls = [];
    assert.throws(() => load(file, {}, dbMocks(calls)), /Configure PGDATABASE_URL/);
    assert.equal(calls.length, 0);
    checks++;
    for (const env of [
      { PGDATABASE_URL: 'postgresql://localhost/test' },
      { DATABASE_URL: 'postgresql://localhost/alternate' },
      { PGDATABASE_URL: 'postgresql://localhost/preferred', DATABASE_URL: 'postgresql://localhost/unused' },
    ]) {
      const used = [];
      load(file, env, dbMocks(used));
      assert.deepEqual(used, [env.PGDATABASE_URL || env.DATABASE_URL]);
      checks++;
    }
  }
  for (const scenario of [
    { env: {}, existing: false, ok: false },
    { env: { BOOTSTRAP_ADMIN_PASSWORD: 'short' }, existing: false, ok: false },
    { env: { BOOTSTRAP_ADMIN_PASSWORD: 'synthetic-test-password-only' }, existing: false, ok: true },
    { env: {}, existing: true, ok: true },
  ]) {
    const inserted = [], hashed = [];
    const db = {
      execute: async () => {},
      select: () => ({ from: () => ({ where: () => ({ limit: async () => scenario.existing ? [{ username: 'admin' }] : [] }) }) }),
      insert: () => ({ values: async (value) => inserted.push(value) }),
    };
    const result = load('src/lib/init-admin.ts', scenario.env, {
      '@/lib/db': { db, admins: { username: 'username' } },
      bcryptjs: { hash: async (value) => { hashed.push(value); return 'synthetic-hash'; } },
      'drizzle-orm': { eq: () => ({}) },
    });
    assert.equal((await result.exports.initAdminTable()).success, scenario.ok);
    const shouldInsert = scenario.ok && !scenario.existing;
    assert.equal(inserted.length, shouldInsert ? 1 : 0);
    assert.equal(hashed.length, shouldInsert ? 1 : 0);
    if (shouldInsert) {
      assert.equal(hashed[0], scenario.env.BOOTSTRAP_ADMIN_PASSWORD);
      assert.equal(inserted[0].password, 'synthetic-hash');
      assert.ok(result.logs.every(line => !line.includes(scenario.env.BOOTSTRAP_ADMIN_PASSWORD)));
    }
    checks++;
  }
  console.log(`${checks} configuration checks passed; no external services accessed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
