const { v4: uuidv4 } = require('uuid');
const db = require('../db');

class TestCase {
  static serialize(row) {
    if (!row) return null;
    return {
      id: row.id,
      workflowId: row.workflow_id,
      userStoryId: row.user_story_id,
      title: row.title,
      category: row.category,
      preconditions: row.preconditions,
      steps: JSON.parse(row.steps || '[]'),
      expectedResult: row.expected_result,
      status: row.status,
      orderIndex: row.order_index,
    };
  }

  static findByProject(projectId) {
    return db
      .prepare(`
        SELECT tc.* FROM test_cases tc
        JOIN workflows w ON w.id = tc.workflow_id
        WHERE w.project_id = ?
        ORDER BY tc.order_index ASC
      `)
      .all(projectId)
      .map(TestCase.serialize);
  }

  static findApprovedByProject(projectId) {
    return db
      .prepare(`
        SELECT tc.* FROM test_cases tc
        JOIN workflows w ON w.id = tc.workflow_id
        WHERE w.project_id = ? AND tc.status = 'approved'
        ORDER BY tc.order_index ASC
      `)
      .all(projectId)
      .map(TestCase.serialize);
  }

  static insertMany(workflowId, testCases) {
    const insert = db.prepare(`
      INSERT INTO test_cases (id, workflow_id, user_story_id, title, category, preconditions, steps, expected_result, order_index)
      VALUES (@id, @workflow_id, @user_story_id, @title, @category, @preconditions, @steps, @expected_result, @order_index)
    `);
    const ids = [];
    const run = db.transaction((items) => {
      items.forEach((tc, idx) => {
        const id = uuidv4();
        ids.push(id);
        insert.run({
          id,
          workflow_id: workflowId,
          user_story_id: tc.userStoryId || null,
          title: tc.title,
          category: tc.category || 'positive',
          preconditions: tc.preconditions || '',
          steps: JSON.stringify(tc.steps || []),
          expected_result: tc.expectedResult || '',
          order_index: idx,
        });
      });
    });
    run(testCases);
    return ids;
  }

  static findById(id) {
    return db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id) || null;
  }

  static update(id, { title, category, preconditions, steps, expectedResult }) {
    db.prepare(`
      UPDATE test_cases
      SET title = ?, category = ?, preconditions = ?, steps = ?, expected_result = ?
      WHERE id = ?
    `).run(title, category, preconditions || '', JSON.stringify(steps || []), expectedResult || '', id);
    return TestCase.findById(id);
  }

  static setStatusBulk(ids, status) {
    const stmt = db.prepare('UPDATE test_cases SET status = ? WHERE id = ?');
    const run = db.transaction((list) => list.forEach((id) => stmt.run(status, id)));
    run(ids);
  }

  static allApprovedForProject(projectId) {
    const row = db
      .prepare(`
        SELECT COUNT(*) AS total, SUM(CASE WHEN tc.status = 'approved' THEN 1 ELSE 0 END) AS approved
        FROM test_cases tc JOIN workflows w ON w.id = tc.workflow_id
        WHERE w.project_id = ?
      `)
      .get(projectId);
    return row.total > 0 && row.total === row.approved;
  }
}

module.exports = TestCase;
