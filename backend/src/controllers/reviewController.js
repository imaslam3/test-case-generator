const Project = require('../models/Project');
const Workflow = require('../models/Workflow');
const Rule = require('../models/Rule');
const UserStory = require('../models/UserStory');
const TestCase = require('../models/TestCase');

const ALLOWED_STATUSES = ['approved', 'rejected', 'pending'];

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

async function bulkWorkflows(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = validateBody(req, res);
  if (!body) return;

  Workflow.setStatusBulk(body.ids, body.status);

  if (Workflow.allReviewed(project.id)) {
    advanceStage(project.id, 'workflows');
  }

  res.json({
    stage: Project.serialize(Project.findById(project.id)).stage,
    workflows: Workflow.findByProject(project.id),
  });
}

async function bulkRules(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = validateBody(req, res);
  if (!body) return;

  Rule.setStatusBulk(body.ids, body.status);

  if (Rule.allReviewedForProject(project.id)) {
    advanceStage(project.id, 'rules');
  }

  res.json({
    stage: Project.serialize(Project.findById(project.id)).stage,
    rules: Rule.findByProject(project.id),
  });
}

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

async function bulkUserStories(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = validateBody(req, res);
  if (!body) return;

  UserStory.setStatusBulk(body.ids, body.status);

  if (UserStory.allReviewedForProject(project.id)) {
    advanceStage(project.id, 'user_stories');
  }

  res.json({
    stage: Project.serialize(Project.findById(project.id)).stage,
    userStories: UserStory.findByProject(project.id),
  });
}

async function bulkTestCases(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = validateBody(req, res);
  if (!body) return;

  TestCase.setStatusBulk(body.ids, body.status);

  if (TestCase.allReviewedForProject(project.id)) {
    Project.setStage(project.id, 'export');
  }

  res.json({
    stage: Project.serialize(Project.findById(project.id)).stage,
    testCases: TestCase.findByProject(project.id),
  });
}

module.exports = { bulkWorkflows, bulkRules, markRulesExplicit, bulkUserStories, bulkTestCases };
