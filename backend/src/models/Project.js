const db = require('../db');

class Project {
  static serialize(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      contextText: row.context_text,
      generateTestCases: !!row.generate_test_cases,
      generateUserStories: !!row.generate_user_stories,
      stage: row.stage,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static findAll() {
    const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    return rows.map(Project.serialize);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) || null;
  }

  static create({ id, name, contextText, generateTestCases = true, generateUserStories = true }) {
    db.prepare(`
      INSERT INTO projects (id, name, context_text, generate_test_cases, generate_user_stories)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, contextText, generateTestCases ? 1 : 0, generateUserStories ? 1 : 0);
    return Project.findById(id);
  }

  static setStage(id, stage) {
    db.prepare("UPDATE projects SET stage = ?, updated_at = datetime('now') WHERE id = ?").run(stage, id);
  }

  static delete(id) {
    return db.prepare('DELETE FROM projects WHERE id = ?').run(id).changes > 0;
  }
}

module.exports = Project;
