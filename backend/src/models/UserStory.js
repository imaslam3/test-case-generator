const { v4: uuidv4 } = require('uuid');
const db = require('../db');

class UserStory {
  static serialize(row) {
    if (!row) return null;
    return {
      id: row.id,
      workflowId: row.workflow_id,
      ruleId: row.rule_id,
      text: row.text,
      status: row.status,
      orderIndex: row.order_index,
    };
  }

  static findByProject(projectId) {
    return db
      .prepare(`
        SELECT us.* FROM user_stories us
        JOIN workflows w ON w.id = us.workflow_id
        WHERE w.project_id = ?
        ORDER BY us.order_index ASC
      `)
      .all(projectId)
      .map(UserStory.serialize);
  }

  static insertMany(workflowId, stories) {
    const insert = db.prepare(`
      INSERT INTO user_stories (id, workflow_id, rule_id, text, order_index)
      VALUES (@id, @workflow_id, @rule_id, @text, @order_index)
    `);
    const ids = [];
    const run = db.transaction((items) => {
      items.forEach((s, idx) => {
        const id = uuidv4();
        ids.push(id);
        insert.run({ id, workflow_id: workflowId, rule_id: s.ruleId || null, text: s.text, order_index: idx });
      });
    });
    run(stories);
    return ids;
  }

  static setStatusBulk(ids, status) {
    const stmt = db.prepare('UPDATE user_stories SET status = ? WHERE id = ?');
    const run = db.transaction((list) => list.forEach((id) => stmt.run(status, id)));
    run(ids);
  }

  static allReviewedForProject(projectId) {
    const row = db
      .prepare(`
        SELECT COUNT(*) AS total, SUM(CASE WHEN us.status = 'pending' THEN 1 ELSE 0 END) AS pending
        FROM user_stories us JOIN workflows w ON w.id = us.workflow_id
        WHERE w.project_id = ?
      `)
      .get(projectId);
    return row.total > 0 && row.pending === 0;
  }
}

module.exports = UserStory;
