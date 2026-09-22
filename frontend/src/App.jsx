import { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import ProjectSetup from './components/ProjectSetup.jsx';
import GenerateOptionsForm from './components/GenerateOptionsForm.jsx';
import ReviewList from './components/ReviewList.jsx';
import TestCaseReviewList from './components/TestCaseReviewList.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import ChatLog from './components/ChatLog.jsx';
import StageNav from './components/StageNav.jsx';
import * as api from './api.js';

const SCREEN = {
  WELCOME: 'welcome',
  SETUP: 'setup',
  OPTIONS: 'options',
  PIPELINE: 'pipeline',
};

const STORAGE_KEY = 'tcg_project_id';

const STAGE_MESSAGE = {
  rules: 'Step 2: review the rules',
  user_stories: 'Step 3: review the user stories',
  test_cases: 'Step 4: review the test cases',
  export: 'Everything is approved — export the test cases.',
};

const PIPELINE_ORDER = ['workflows', 'rules', 'user_stories', 'test_cases', 'export'];
const PIPELINE_LABEL = {
  workflows: 'Workflows',
  rules: 'Rules',
  user_stories: 'User Stories',
  test_cases: 'Test Cases',
  export: 'Export',
};
const normalizeStage = (stage) => (stage === 'exported' ? 'export' : stage);

export default function App() {
  const [screen, setScreen] = useState(SCREEN.WELCOME);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const [viewStage, setViewStage] = useState(null);

  function pushLog(line) {
    setLog((prev) => [...prev, line]);
  }

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) {
      setResuming(false);
      return;
    }
    api.getProject(savedId)
      .then((full) => {
        setProject(full);
        setViewStage(null);
        setScreen(full.stage === 'draft' ? SCREEN.OPTIONS : SCREEN.PIPELINE);
        pushLog(`Resumed project "${full.name}".`);
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setResuming(false));
  }, []);

  function handleStart() {
    setScreen(SCREEN.SETUP);
  }

  function handleNewProject() {
    localStorage.removeItem(STORAGE_KEY);
    setProject(null);
    setLog([]);
    setError(null);
    setScreen(SCREEN.WELCOME);
  }

  async function handleSetupSubmit(name, contextText) {
    setError(null);
    setLoading(true);
    try {
      const created = await api.createProject(name, contextText);
      setProject(created);
      localStorage.setItem(STORAGE_KEY, created.id);
      pushLog(`Project "${name}" created successfully.`);
      setScreen(SCREEN.OPTIONS);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(options) {
    setError(null);
    setLoading(true);
    try {
      await api.updateProjectOptions(project.id, options);
      const result = await api.generateHierarchy(project.id);
      pushLog('Test design hierarchy created successfully.');
      pushLog('Step 1: Review the workflows');
      setProject((prev) => ({ ...prev, ...result }));
      setViewStage(null);
      setScreen(SCREEN.PIPELINE);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProject() {
    const full = await api.getProject(project.id);
    setProject(full);
    return full;
  }

  async function handleBulkStatus(kind, ids, status) {
    setError(null);
    try {
      if (!ids.length) return;
      await api.bulkStatus(project.id, kind, ids, status);
      const full = await refreshProject();
      if (full.stage !== project.stage && STAGE_MESSAGE[full.stage]) pushLog(STAGE_MESSAGE[full.stage]);
      setViewStage(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleMarkExplicit(ids) {
    try {
      await api.markRulesExplicit(project.id, ids);
      await refreshProject();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRegenerate() {
    setError(null);
    setLoading(true);
    try {
      const result = await api.regenerateHierarchy(project.id);
      pushLog('Regenerated the test design hierarchy.');
      pushLog('Step 1: Review the workflows');
      setProject((prev) => ({ ...prev, ...result }));
      setViewStage(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditTestCase(id, payload) {
    try {
      await api.updateTestCase(id, payload);
      await refreshProject();
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }

  const currentStage = project ? normalizeStage(project.stage) : null;
  const availableStages = project
    ? PIPELINE_ORDER.filter((stage) => {
        if (stage === 'workflows') return project.workflows?.length > 0;
        if (stage === 'rules') return project.rules?.length > 0;
        if (stage === 'user_stories') return project.userStories?.length > 0;
        if (stage === 'test_cases') return project.testCases?.length > 0;
        if (stage === 'export') return PIPELINE_ORDER.indexOf(currentStage) >= PIPELINE_ORDER.indexOf('export');
        return false;
      })
    : [];
  const activeStage = viewStage && availableStages.includes(viewStage) ? viewStage : currentStage;

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="brand">FT / {project ? project.name.toUpperCase() : 'MELO'}</span>
      </header>

      <main className="app-canvas">
        {resuming ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {error && (
              <div className="error-banner" role="alert">
                {error}
                <button type="button" onClick={() => setError(null)} aria-label="Dismiss">✕</button>
              </div>
            )}

            {log.length > 0 && <ChatLog messages={log} />}

            {screen === SCREEN.WELCOME && <WelcomeScreen onStart={handleStart} />}

            {screen === SCREEN.SETUP && <ProjectSetup onSubmit={handleSetupSubmit} onCancel={handleNewProject} isLoading={loading} />}

            {screen === SCREEN.OPTIONS && <GenerateOptionsForm onGenerate={handleGenerate} isLoading={loading} />}

            {screen === SCREEN.PIPELINE && project && (
              <StageNav
                stages={availableStages}
                activeStage={activeStage}
                currentStage={currentStage}
                onSelect={(stage) => setViewStage(stage === currentStage ? null : stage)}
              />
            )}

            {screen === SCREEN.PIPELINE && project && activeStage !== currentStage && (
              <p className="viewing-past-stage">
                Reviewing an earlier stage — your progress at "{PIPELINE_LABEL[currentStage]}" is unaffected.{' '}
                <button type="button" className="link-btn" onClick={() => setViewStage(null)}>Back to current step →</button>
              </p>
            )}

            {screen === SCREEN.PIPELINE && project && activeStage !== 'export' && (
              <div className="regenerate-bar">
                <button type="button" className="secondary" onClick={handleRegenerate} disabled={loading}>
                  {loading ? 'Regenerating…' : '↻ Regenerate (re-prompt the AI)'}
                </button>
              </div>
            )}

            {screen === SCREEN.PIPELINE && project && activeStage === 'workflows' && (
              <ReviewList
                title="Generated Workflows"
                items={project.workflows.map((w) => ({
                  id: w.id,
                  primary: w.title,
                  secondary: w.description,
                  status: w.status,
                }))}
                onBulkStatus={(ids, status) => handleBulkStatus('workflows', ids, status)}
              />
            )}

            {screen === SCREEN.PIPELINE && project && activeStage === 'rules' && (
              <ReviewList
                title="Generated Rules"
                items={project.rules.map((r) => ({
                  id: r.id,
                  primary: r.text,
                  status: r.status,
                }))}
                renderMeta={(item) => {
                  const rule = project.rules.find((r) => r.id === item.id);
                  return rule?.isExplicit ? <span className="explicit-tag">Explicit</span> : null;
                }}
                onBulkStatus={(ids, status) => handleBulkStatus('rules', ids, status)}
                onMarkExplicit={handleMarkExplicit}
              />
            )}

            {screen === SCREEN.PIPELINE && project && activeStage === 'user_stories' && (
              <ReviewList
                title="Generated User Stories"
                items={project.userStories.map((s) => ({
                  id: s.id,
                  primary: s.text,
                  status: s.status,
                }))}
                onBulkStatus={(ids, status) => handleBulkStatus('user-stories', ids, status)}
              />
            )}

            {screen === SCREEN.PIPELINE && project && activeStage === 'test_cases' && (
              <TestCaseReviewList
                testCases={project.testCases}
                onBulkStatus={(ids, status) => handleBulkStatus('test-cases', ids, status)}
                onEditSave={handleEditTestCase}
              />
            )}

            {screen === SCREEN.PIPELINE && project && activeStage === 'export' && (
              <ExportPanel
                testCaseCount={project.testCases.filter((tc) => tc.status === 'approved').length}
                exportUrl={api.exportCsvUrl(project.id)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
