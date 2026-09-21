const { v4: uuidv4 } = require('uuid');
const Project = require('../models/Project');
const Workflow = require('../models/Workflow');
const Rule = require('../models/Rule');
const UserStory = require('../models/UserStory');
const TestCase = require('../models/TestCase');
const { generateHierarchy } = require('../services/aiService');

async function list(req, res) {
  res.json(Project.findAll());
}

async function getOne(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  res.json({
    ...Project.serialize(project),
    workflows: Workflow.findByProject(project.id),
    rules: Rule.findByProject(project.id),
    userStories: UserStory.findByProject(project.id),
    testCases: TestCase.findByProject(project.id),
  });
}

// POST /api/projects — Step: "Enter Project Name" + "Associate Context"
async function create(req, res) {
  const { name, contextText } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Project name is required.' });
  }
  if (!contextText || !String(contextText).trim()) {
    return res.status(400).json({ error: 'Context (the requirement / description) is required.' });
  }
  if (contextText.length > 8000) {
    return res.status(400).json({ error: 'Context is too long (max 8000 characters).' });
  }

  const project = Project.create({
    id: uuidv4(),
    name: name.trim(),
    contextText: contextText.trim(),
  });

  res.status(201).json(Project.serialize(project));
}

// PUT /api/projects/:id/options — choose what the AI should generate
async function updateOptions(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { generateTestCases, generateUserStories } = req.body;

  const db = require('../db');
  db.prepare(`
    UPDATE projects
    SET generate_test_cases = ?, generate_user_stories = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    generateTestCases === undefined ? project.generate_test_cases : (generateTestCases ? 1 : 0),
    generateUserStories === undefined ? project.generate_user_stories : (generateUserStories ? 1 : 0),
    project.id
  );

  res.json(Project.serialize(Project.findById(project.id)));
}

// POST /api/projects/:id/generate — runs the AI, builds Workflows -> Rules -> User Stories -> Test Cases
async function generate(req, res) {
  const project = Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  try {
    const hierarchy = await generateHierarchy(project.context_text, {
      generateUserStories: !!project.generate_user_stories,
      generateTestCases: !!project.generate_test_cases,
    });

    // Idempotent: wipes any previous run's workflows/rules/user stories/test cases
    // (cascade-deleted via the FK) so this same endpoint safely doubles as "Regenerate".
    Workflow.deleteAllForProject(project.id);

    for (const wf of hierarchy.workflows) {
      const [workflowId] = Workflow.insertMany(project.id, [{ title: wf.title, description: wf.description }]);

      const ruleIds = wf.rules.length ? Rule.insertMany(workflowId, wf.rules) : [];

      const storiesWithRuleIds = wf.userStories.map((s) => ({
        text: s.text,
        ruleId: s.ruleIndex !== null && ruleIds[s.ruleIndex] ? ruleIds[s.ruleIndex] : null,
      }));
      const storyIds = storiesWithRuleIds.length ? UserStory.insertMany(workflowId, storiesWithRuleIds) : [];

      const testCasesWithStoryIds = wf.testCases.map((tc) => ({
        ...tc,
        userStoryId: tc.userStoryIndex !== null && storyIds[tc.userStoryIndex] ? storyIds[tc.userStoryIndex] : null,
      }));
      if (testCasesWithStoryIds.length) {
        TestCase.insertMany(workflowId, testCasesWithStoryIds);
      }
    }

    Project.setStage(project.id, 'workflows');

    res.json({
      id: project.id,
      stage: 'workflows',
      workflows: Workflow.findByProject(project.id),
      rules: Rule.findByProject(project.id),
      userStories: UserStory.findByProject(project.id),
      testCases: TestCase.findByProject(project.id),
    });
  } catch (err) {
    const statusByCode = { NO_API_KEY: 500, MODEL_NOT_FOUND: 500, SERVICE_UNAVAILABLE: 503, RATE_LIMITED: 429 };
    res.status(statusByCode[err.code] || 502).json({
      error: err.message || 'Failed to generate the test design hierarchy.',
      code: err.code || 'UNKNOWN',
    });
  }
}

async function remove(req, res) {
  const deleted = Project.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Project not found' });
  res.status(204).send();
}

module.exports = { list, getOne, create, updateOptions, generate, remove };
