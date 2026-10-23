/**
 * Runner de migrations (lib/migrate.js) sur une vraie base (TEST_DATABASE_URL).
 * Chaque test travaille dans un schéma PostgreSQL isolé (search_path), jamais dans « public ».
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Client } = require('pg');
const { runMigrations, listMigrationFiles, getMigrationStatus } = require('../../lib/migrate.js');
const { describeWithDb } = require('../helpers/testHelpers.js');

const connectionString = process.env.TEST_DATABASE_URL;
const silentLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const createdSchemas = [];

async function withAdmin(fn) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Nouveau schéma vide + configuration de connexion qui l'utilise par défaut
async function freshSchema(label) {
  const schema = `migr_${label}_${process.pid}_${Date.now()}`.toLowerCase();
  await withAdmin(client => client.query(`CREATE SCHEMA ${schema}`));
  createdSchemas.push(schema);
  return { schema, config: { connectionString, options: `-c search_path=${schema}` } };
}

async function tablesOf(schema) {
  return withAdmin(async (client) => {
    const { rows } = await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY 1', [schema]);
    return rows.map(row => row.table_name);
  });
}

async function columnsOf(schema, table) {
  return withAdmin(async (client) => {
    const { rows } = await client.query(
      'SELECT column_name, is_nullable, character_maximum_length FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
      [schema, table]
    );
    return Object.fromEntries(rows.map(row => [row.column_name, row]));
  });
}

function tempMigrationsDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-migrations-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

describe('listMigrationFiles', () => {
  it('ne retient que les fichiers NNNN_nom.sql, dans l\'ordre lexical', () => {
    const dir = tempMigrationsDir({
      '0100_feature.sql': '',
      '0001_baseline.sql': '',
      'README.md': '',
      '12_mauvais_nom.sql': '',
      '0002_suite.sql.bak': ''
    });
    expect(listMigrationFiles(dir)).toEqual(['0001_baseline.sql', '0100_feature.sql']);
  });

  it('le dossier du projet commence par la baseline', () => {
    expect(listMigrationFiles()[0]).toBe('0001_baseline.sql');
  });
});

describeWithDb('runMigrations (base réelle)', () => {
  afterAll(async () => {
    await withAdmin(async (client) => {
      for (const schema of createdSchemas) {
        await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      }
    });
  });

  it('crée tout le schéma sur une base vide, puis ne rejoue rien', async () => {
    const { schema, config } = await freshSchema('fresh');
    const files = listMigrationFiles();

    const first = await runMigrations({ connectionConfig: config, log: silentLog });
    expect(first.applied).toEqual(files);

    const tables = await tablesOf(schema);
    for (const table of ['schema_migrations', 'profiles', 'pin_codes', 'family_gate', 'lessons', 'course_pages', 'quiz_results',
      'badges', 'profile_badges', 'notifications', 'activities', 'youtube_videos', 'audit_logs', 'ai_settings']) {
      expect(tables).toContain(table);
    }

    const second = await runMigrations({ connectionConfig: config, log: silentLog });
    expect(second.applied).toEqual([]);
    expect(second.alreadyApplied).toBe(files.length);

    const status = await getMigrationStatus({ connectionConfig: config });
    expect(status.pending).toEqual([]);
    expect(status.applied.map(row => row.name)).toEqual(files);
  });

  it('les fichiers SQL sont idempotents : les rejouer sur un schéma déjà créé ne casse rien', async () => {
    const { config } = await freshSchema('replay');
    await runMigrations({ connectionConfig: config, log: silentLog });

    const client = new Client(config);
    await client.connect();
    try {
      await client.query('DELETE FROM schema_migrations');
    } finally {
      await client.end();
    }

    const replay = await runMigrations({ connectionConfig: config, log: silentLog });
    expect(replay.applied).toEqual(listMigrationFiles());
  });

  it('complète un ancien schéma de production sans perdre de données', async () => {
    const { schema, config } = await freshSchema('legacy');
    const client = new Client(config);
    await client.connect();
    try {
      // Tables créées autrefois par les scripts frontend (avant le DDL de server.js)
      await client.query(`
        CREATE TABLE profiles (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, type VARCHAR(20) NOT NULL DEFAULT 'child', is_admin BOOLEAN DEFAULT FALSE);
        CREATE TABLE pin_codes (id SERIAL PRIMARY KEY, profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE, pin_code VARCHAR(10) NOT NULL);
        CREATE TABLE lessons (id SERIAL PRIMARY KEY, profile_id INTEGER REFERENCES profiles(id), title VARCHAR(255) NOT NULL, quiz_data JSONB NOT NULL);
        CREATE TABLE quiz_results (id SERIAL PRIMARY KEY, lesson_id INTEGER NOT NULL REFERENCES lessons(id), profile_id INTEGER REFERENCES profiles(id),
          score INTEGER NOT NULL, total_questions INTEGER NOT NULL, percentage DECIMAL(5,2) NOT NULL, answers JSONB NOT NULL, completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE activities (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT NOT NULL, type VARCHAR(50) NOT NULL);
        CREATE TABLE youtube_videos (id SERIAL PRIMARY KEY, url TEXT NOT NULL, video_id VARCHAR(20) NOT NULL UNIQUE, title VARCHAR(255) NOT NULL, category VARCHAR(100) NOT NULL);
        CREATE TABLE audit_logs (id SERIAL PRIMARY KEY, action VARCHAR(255) NOT NULL, user_id INTEGER NOT NULL, category VARCHAR(100) NOT NULL, level VARCHAR(20) NOT NULL DEFAULT 'info');
        -- Import avec id explicites : séquence en retard
        INSERT INTO profiles (id, name) VALUES (1, 'Parent'), (2, 'Léa');
        INSERT INTO lessons (id, profile_id, title, quiz_data) VALUES (5, 1, 'Leçon', '{}');
        INSERT INTO quiz_results (id, lesson_id, profile_id, score, total_questions, percentage, answers) VALUES (9, 5, 2, 1, 2, 50, '[]');
      `);
    } finally {
      await client.end();
    }

    await runMigrations({ connectionConfig: config, log: silentLog });

    const quizColumns = await columnsOf(schema, 'quiz_results');
    expect(quizColumns.is_completed).toBeDefined();
    expect(quizColumns.course_page_id).toBeDefined();
    expect(quizColumns.lesson_id.is_nullable).toBe('YES');
    expect((await columnsOf(schema, 'lessons')).target_profile_id).toBeDefined();
    expect((await columnsOf(schema, 'activities')).child_id).toBeDefined();
    expect((await columnsOf(schema, 'pin_codes')).pin_code.character_maximum_length).toBe(255);
    expect((await columnsOf(schema, 'youtube_videos')).video_id.character_maximum_length).toBe(64);
    expect((await columnsOf(schema, 'audit_logs')).user_id.is_nullable).toBe('YES');

    const check = new Client(config);
    await check.connect();
    try {
      // Données conservées, valeurs par défaut appliquées, séquences resynchronisées
      const { rows: results } = await check.query('SELECT id, is_completed FROM quiz_results');
      expect(results).toEqual([{ id: 9, is_completed: true }]);
      const { rows: lesson } = await check.query(`INSERT INTO lessons (profile_id, title, quiz_data) VALUES (1, 'Nouvelle', '{}') RETURNING id`);
      expect(lesson[0].id).toBe(6);
      const { rows: result } = await check.query(`INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers) VALUES (5, 2, 1, 1, 100, '[]') RETURNING id`);
      expect(result[0].id).toBe(10);
    } finally {
      await check.end();
    }
  });

  it('une migration en échec est annulée, signalée, et bloque les suivantes', async () => {
    const { schema, config } = await freshSchema('failure');
    const dir = tempMigrationsDir({
      '0001_ok.sql': 'CREATE TABLE t_ok (id INT);',
      '0002_ko.sql': 'CREATE TABLE t_ko (id INT);\nSELECT * FROM table_inexistante;',
      '0003_jamais.sql': 'CREATE TABLE t_jamais (id INT);'
    });

    await expect(runMigrations({ connectionConfig: config, migrationsDir: dir, log: silentLog }))
      .rejects.toMatchObject({ migration: '0002_ko.sql', code: '42P01' });

    const tables = await tablesOf(schema);
    expect(tables).toContain('t_ok');
    expect(tables).not.toContain('t_ko');
    expect(tables).not.toContain('t_jamais');
    const status = await getMigrationStatus({ connectionConfig: config, migrationsDir: dir });
    expect(status.applied.map(row => row.name)).toEqual(['0001_ok.sql']);
    expect(status.pending).toEqual(['0002_ko.sql', '0003_jamais.sql']);
    expect(silentLog.error).toHaveBeenCalledWith(expect.stringContaining('0002_ko.sql'), expect.objectContaining({ migration: '0002_ko.sql' }));
  });

  it('deux instances simultanées : chaque migration n\'est appliquée qu\'une fois (verrou consultatif)', async () => {
    const { config } = await freshSchema('lock');
    const dir = tempMigrationsDir({
      '0001_lent.sql': 'CREATE TABLE compteur (n INT); SELECT pg_sleep(0.3); INSERT INTO compteur VALUES (1);',
      '0002_suite.sql': 'INSERT INTO compteur VALUES (2);'
    });

    const [a, b] = await Promise.all([
      runMigrations({ connectionConfig: config, migrationsDir: dir, log: silentLog }),
      runMigrations({ connectionConfig: config, migrationsDir: dir, log: silentLog })
    ]);

    expect([...a.applied, ...b.applied].sort()).toEqual(['0001_lent.sql', '0002_suite.sql']);
    const client = new Client(config);
    await client.connect();
    try {
      const { rows } = await client.query('SELECT n FROM compteur ORDER BY n');
      expect(rows.map(row => row.n)).toEqual([1, 2]);
    } finally {
      await client.end();
    }
  });
});
