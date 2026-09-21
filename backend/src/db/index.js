const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/app.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    context_text TEXT NOT NULL,
    generate_test_cases INTEGER NOT NULL DEFAULT 1,
    generate_user_stories INTEGER NOT NULL DEFAULT 1,
    -- pipeline stage: draft -> workflows -> rules -> user_stories -> test_cases -> exported
    stage TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    text TEXT NOT NULL,
    is_explicit INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_stories (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    rule_id TEXT,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS test_cases (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    user_story_id TEXT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'positive', -- positive | negative | edge_case | validation
    preconditions TEXT,
    steps TEXT NOT NULL DEFAULT '[]',
    expected_result TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (user_story_id) REFERENCES user_stories(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id);
  CREATE INDEX IF NOT EXISTS idx_rules_workflow ON rules(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_user_stories_workflow ON user_stories(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_test_cases_workflow ON test_cases(workflow_id);
`);

module.exports = db;
