const TestCase = require('../models/TestCase');

const ALLOWED_CATEGORIES = ['positive', 'negative', 'edge_case', 'validation'];

async function update(req, res) {
  const existing = TestCase.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Test case not found' });

  const {
    title = existing.title,
    category = existing.category,
    preconditions = existing.preconditions,
    steps = JSON.parse(existing.steps || '[]'),
    expectedResult = existing.expected_result,
  } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Title cannot be empty.' });
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of ${ALLOWED_CATEGORIES.join(', ')}` });
  }
  if (!Array.isArray(steps)) {
    return res.status(400).json({ error: 'steps must be an array of strings.' });
  }

  const updated = TestCase.update(req.params.id, {
    title: String(title).trim(),
    category,
    preconditions: preconditions || '',
    steps: steps.map(String).filter((s) => s.trim()),
    expectedResult: expectedResult || '',
  });

  res.json(TestCase.serialize(updated));
}

module.exports = { update };
