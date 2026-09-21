require('dotenv').config();

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

function buildSystemPrompt({ generateUserStories, generateTestCases }) {
  return `You are a senior business analyst and QA architect. Given a software requirement or project context, decompose it into a structured test design hierarchy:

Requirement/context → Workflows (major functional flows) → Rules (business rules governing each workflow) → User Stories (derived from the rules) → Test Cases (derived from the user stories, covering positive/negative/edge_case/validation scenarios).

Respond with ONLY a valid JSON object (no markdown fences, no prose) shaped exactly like this:

{
  "workflows": [
    {
      "title": "short workflow name",
      "description": "one sentence describing this workflow",
      "rules": [
        { "text": "a specific business rule for this workflow", "isExplicit": true }
      ],
      "userStories": [
        { "text": "As a <role>, I want <goal> so that <benefit>.", "ruleIndex": 0 }
      ]${generateTestCases ? `,
      "testCases": [
        {
          "title": "short test case name",
          "category": "positive | negative | edge_case | validation",
          "preconditions": "setup needed, can be empty string",
          "steps": ["step one", "step two"],
          "expectedResult": "expected outcome",
          "userStoryIndex": 0
        }
      ]` : ''}
    }
  ]
}

Rules:
- Generate 2-4 workflows that cover the major functional areas implied by the context.
- Each workflow needs 3-8 rules (mark truly unambiguous, explicitly-stated rules as "isExplicit": true; reasonable inferred rules as false).
- ${generateUserStories ? 'Each workflow needs 2-5 user stories, each referencing the rule (by its 0-based index within that workflow\'s rules array) it was derived from via "ruleIndex".' : 'Omit "userStories" entirely for each workflow (still include an empty array).'}
- ${generateTestCases ? `Each workflow needs 3-8 test cases covering a realistic mix of positive, negative, edge_case, and validation scenarios, each referencing the user story (by its 0-based index within that workflow's userStories array) it was derived from via "userStoryIndex". Write steps and the expected result as plain, imperative instructions.` : 'Omit "testCases" entirely.'}
- Output ONLY the JSON object. No text before or after it.`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

async function callGroq(userContent, systemPrompt) {
  return fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' }, // Groq/OpenAI-style strict JSON mode
      temperature: 0.6,
      max_tokens: 8000,
    }),
  });
}

async function generateHierarchy(contextText, options = {}) {
  const { generateUserStories = true, generateTestCases = true } = options;

  if (!process.env.GROQ_API_KEY) {
    const err = new Error('GROQ_API_KEY is not configured on the server.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const userContent = `Context / requirement:\n"""\n${contextText}\n"""\n\nGenerate the JSON now.`;

  const systemPrompt = buildSystemPrompt({ generateUserStories, generateTestCases });

  let response;
  let lastErrorBody = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      response = await callGroq(userContent, systemPrompt);
    } catch (networkErr) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }
      const err = new Error('Failed to reach the AI provider (Groq). Please check your network/API configuration.');
      err.code = 'NETWORK_ERROR';
      throw err;
    }

    if (response.ok) break;

    if (response.status === 429) {
      const err = new Error('Groq rate limit exceeded (free tier). Please wait a moment and try again.');
      err.code = 'RATE_LIMITED';
      throw err;
    }

    lastErrorBody = await response.text().catch(() => '');

    if (response.status === 404) {
      const err = new Error(`The configured AI model "${MODEL}" is not available on your Groq account. Set GROQ_MODEL in backend/.env to a supported model (e.g. openai/gpt-oss-120b).`);
      err.code = 'MODEL_NOT_FOUND';
      throw err;
    }

    if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      continue;
    }

    const err = new Error(`Groq returned an error (${response.status}): ${lastErrorBody.slice(0, 400)}`);
    err.code = 'PROVIDER_ERROR';
    throw err;
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || '';
  const parsed = parseJson(rawText);

  if (!parsed || !Array.isArray(parsed.workflows)) {
    const err = new Error('The AI response could not be parsed as a valid workflow hierarchy.');
    err.code = 'PARSE_ERROR';
    throw err;
  }

  return normalizeHierarchy(parsed);
}

function parseJson(rawText) {
  if (!rawText) return null;
  let candidate = rawText.trim();
  const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) candidate = fenceMatch[1].trim();
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) candidate = candidate.slice(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch (e) {
    return null;
  }
}

const ALLOWED_CATEGORIES = ['positive', 'negative', 'edge_case', 'validation'];

function normalizeHierarchy(parsed) {
  return {
    workflows: (parsed.workflows || []).map((wf) => ({
      title: String(wf.title || 'Untitled workflow').slice(0, 200),
      description: String(wf.description || ''),
      rules: (wf.rules || []).map((r) => ({
        text: String(r.text || ''),
        isExplicit: !!r.isExplicit,
      })),
      userStories: (wf.userStories || []).map((s) => ({
        text: String(s.text || ''),
        ruleIndex: Number.isInteger(s.ruleIndex) ? s.ruleIndex : null,
      })),
      testCases: (wf.testCases || []).map((tc) => ({
        title: String(tc.title || 'Untitled test case').slice(0, 300),
        category: ALLOWED_CATEGORIES.includes(tc.category) ? tc.category : 'positive',
        preconditions: typeof tc.preconditions === 'string' ? tc.preconditions : '',
        steps: Array.isArray(tc.steps) ? tc.steps.map(String) : [],
        expectedResult: typeof tc.expectedResult === 'string' ? tc.expectedResult : '',
        userStoryIndex: Number.isInteger(tc.userStoryIndex) ? tc.userStoryIndex : null,
      })),
    })),
  };
}

module.exports = { generateHierarchy };
