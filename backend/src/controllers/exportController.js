const Project = require('../models/Project');
const TestCase = require('../models/TestCase');

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function exportCsv(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const testCases = TestCase.findApprovedByProject(project.id);
  if (testCases.length === 0) {
    return res.status(400).json({ error: 'No approved test cases to export yet.' });
  }

  const header = ['Title', 'Category', 'Preconditions', 'Steps', 'Expected Result'];
  const rows = testCases.map((tc) => [
    tc.title,
    tc.category,
    tc.preconditions,
    tc.steps.join(' | '),
    tc.expectedResult,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

  Project.setStage(project.id, 'exported');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_test_cases.csv"`);
  res.send(csv);
}

module.exports = { exportCsv };
