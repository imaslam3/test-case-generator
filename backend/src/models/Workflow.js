const { v4: uuidv4 } = require('uuid');
const db = require('../db');

class Workflow {
  static serialize(row) {
    if (!row) return null;
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      status: row.status,
      orderIndex: row.order_index,
    };
  }

  static findByProject(projectId) {
    return db
      .prepare('SELECT * FROM workflows WHERE project_id = ? ORDER BY order_index ASC')
      .all(projectId)
      .map(Workflow.serialize);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) || null;
  }

  /** Wipes all workflows (and, via ON DELETE CASCADE, their rules/user stories/test cases) for a project.
   *  Used by Regenerate so re-running generation doesn't duplicate data. */
  static deleteAllForProject(projectId) {
    db.prepare('DELETE FROM workflows WHERE project_id = ?').run(projectId);
  }

  /** Bulk-insert workflows for a project inside one transaction. Returns serialized rows with ids assigned. */
  static insertMany(projectId, workflows) {
    const insert = db.prepare(`
      INSERT INTO workflows (id, project_id, title, description, order_index)
      VALUES (@id, @project_id, @title, @description, @order_index)
    `);
    const ids = [];
    const run = db.transaction((items) => {
      items.forEach((wf, idx) => {
        const id = uuidv4();
        ids.push(id);
        insert.run({ id, project_id: projectId, title: wf.title, description: wf.description || '', order_index: idx });
      });
    });
    run(workflows);
    return ids;
  }

  static setStatus(id, status) {
    db.prepare('UPDATE workflows SET status = ? WHERE id = ?').run(status, id);
  }

  static setStatusBulk(ids, status) {
    const stmt = db.prepare('UPDATE workflows SET status = ? WHERE id = ?');
    const run = db.transaction((list) => list.forEach((id) => stmt.run(status, id)));
    run(ids);
  }

  static allApproved(projectId) {
    const row = db
      .prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved FROM workflows WHERE project_id = ?")
      .get(projectId);
    return row.total > 0 && row.total === row.approved;
  }
}

module.exports = Workflow;
