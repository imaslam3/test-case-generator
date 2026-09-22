const { v4: uuidv4 } = require('uuid');
const db = require('../db');

class Rule {
  static serialize(row) {
    if (!row) return null;
    return {
      id: row.id,
      workflowId: row.workflow_id,
      text: row.text,
      isExplicit: !!row.is_explicit,
      status: row.status,
      orderIndex: row.order_index,
    };
  }

  static findByProject(projectId) {
    return db
      .prepare(`
        SELECT r.* FROM rules r
        JOIN workflows w ON w.id = r.workflow_id
        WHERE w.project_id = ?
        ORDER BY r.order_index ASC
      `)
      .all(projectId)
      .map(Rule.serialize);
  }

  static findByWorkflow(workflowId) {
    return db.prepare('SELECT * FROM rules WHERE workflow_id = ? ORDER BY order_index ASC').all(workflowId).map(Rule.serialize);
  }

  static insertMany(workflowId, rules) {
    const insert = db.prepare(`
      INSERT INTO rules (id, workflow_id, text, is_explicit, order_index)
      VALUES (@id, @workflow_id, @text, @is_explicit, @order_index)
    `);
    const ids = [];
    const run = db.transaction((items) => {
      items.forEach((r, idx) => {
        const id = uuidv4();
        ids.push(id);
        insert.run({ id, workflow_id: workflowId, text: r.text, is_explicit: r.isExplicit ? 1 : 0, order_index: idx });
      });
    });
    run(rules);
    return ids;
  }

  static setStatusBulk(ids, status) {
    const stmt = db.prepare('UPDATE rules SET status = ? WHERE id = ?');
    const run = db.transaction((list) => list.forEach((id) => stmt.run(status, id)));
    run(ids);
  }

  static setExplicitBulk(ids, isExplicit) {
    const stmt = db.prepare('UPDATE rules SET is_explicit = ? WHERE id = ?');
    const run = db.transaction((list) => list.forEach((id) => stmt.run(isExplicit ? 1 : 0, id)));
    run(ids);
  }

  static allReviewedForProject(projectId) {
    const row = db
      .prepare(`
        SELECT COUNT(*) AS total, SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) AS pending
        FROM rules r JOIN workflows w ON w.id = r.workflow_id
        WHERE w.project_id = ?
      `)
      .get(projectId);
    return row.total > 0 && row.pending === 0;
  }
}

module.exports = Rule;
