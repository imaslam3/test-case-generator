const Project = require('../models/Project');
const Workflow = require('../models/Workflow');
const Rule = require('../models/Rule');
const UserStory = require('../models/UserStory');
const TestCase = require('../models/TestCase');

const ALLOWED_STATUSES = ['approved', 'rejected', 'pending'];

// The user can opt out of generating User Stories or Test Cases, which leaves that
// review stage with zero items. Walk forward to the next stage that actually has
// something to review so the pipeline can never dead-end on an empty list.
const STAGE_ORDER = ['workflows', 'rules', 'user_stories', 'test_cases', 'export'];

const STAGE_COUNT = {
  workflows: (id) => Workflow.findByProject(id).length,
  rules: (id) => Rule.findByProject(id).length,
  user_stories: (id) => UserStory.findByProject(id).length,
  test_cases: (id) => TestCase.findByProject(id).length,
};

function advanceStage(projectId, fromStage) {
  let i = STAGE_ORDER.indexOf(fromStage) + 1;
  while (i < STAGE_ORDER.length - 1 && STAGE_COUNT[STAGE_ORDER[i]](projectId) === 0) i++;
  Project.setStage(projectId, STAGE_ORDER[i]);
}

function validateBody(req, res) {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids must be a non-empty array.' });
    return null;
  }
  if (!ALLOWED_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of ${ALLOWED_STATUSES.join(', ')}` });
    return null;
  }
  return { ids, status };
}

// POST /api/projects/:id/workflows/bulk-status
async function bulkWorkflows(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = validateBody(req, res);
  if (!body) return;

  Workflow.setStatusBulk(body.ids, body.status);

  if (Workflow.allApproved(project.id)) {
    advanceStage(project.id, 'workflows');
  }

  res.json({
    stage: Project.serialize(Project.findById(project.id)).stage,
    workflows: Workflow.findByProject(project.id),
  });
}

// POST /api/projects/:id/rules/bulk-status
async function bulkRules(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = validateBody(req, res);
  if (!body) return;

  Rule.setStatusBulk(body.ids, body.status);

  if (Rule.allApprovedForProject(project.id)) {
    advanceStage(project.id, 'rules');
  }

  res.json({
    stage: Project.serialize(Project.findById(project.id)).stage,
    rules: Rule.findByProject(project.id),
  });
}

// POST /api/projects/:id/rules/mark-explicit
async function markRulesExplicit(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array.' });
  }
  Rule.setExplicitBulk(ids, true);
  res.json({ rules: Rule.findByProject(project.id) });
}

// POST /api/projects/:id/user-stories/bulk-status
async function bulkUserStories(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = validateBody(req, res);
  if (!body) return;

  UserStory.setStatusBulk(body.ids, body.status);

  if (UserStory.allApprovedForProject(project.id)) {
    advanceStage(project.id, 'user_stories');
  }

  res.json({
    stage: Project.serialize(Project.findById(project.id)).stage,
    userStories: UserStory.findByProject(project.id),
  });
}

// POST /api/projects/:id/test-cases/bulk-status
async function bulkTestCases(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = validateBody(req, res);
  if (!body) return;

  TestCase.setStatusBulk(body.ids, body.status);

  if (TestCase.allApprovedForProject(project.id)) {
    Project.setStage(project.id, 'export');
  }

  res.json({
    stage: Project.serialize(Project.findById(project.id)).stage,
    testCases: TestCase.findByProject(project.id),
  });
}

module.exports = { bulkWorkflows, bulkRules, markRulesExplicit, bulkUserStories, bulkTestCases };
