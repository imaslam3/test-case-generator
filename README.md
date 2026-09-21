# AI Test Case Generator

A full-stack app that decomposes a software requirement into a **Workflows → Rules → User Stories → Test Cases** hierarchy using an LLM (Groq — free tier, GPT-OSS 120B), with a human approval gate at every stage — matching the "Test Case Generation" flow in the provided Figma.

## Assignment requirements checklist

| Requirement (from the brief) | Status | Where |
|---|---|---|
| Requirement input (text) | ✅ | `ProjectSetup.jsx` — "Associate Context" step |
| AI-powered generation | ✅ | `services/aiService.js` (Groq) |
| Covers positive/negative/edge_case/validation | ✅ | enforced in the AI system prompt + `category` field |
| **View** test cases | ✅ | `TestCaseReviewList.jsx` |
| **Edit** test cases | ✅ | inline edit form in `TestCaseReviewList.jsx` → `PUT /api/test-cases/:id` |
| **Save** (persists across refresh) | ✅ | SQLite; reload the page and reopen the project via `GET /api/projects/:id` |
| **Regenerate** | ✅ | "↻ Regenerate" button, visible at every pipeline stage → re-calls `POST /api/projects/:id/generate`, which now wipes and rebuilds instead of duplicating |
| React or Angular frontend | ✅ | React (Vite) |
| Node.js or NestJS backend | ✅ | Node.js/Express, MVC layout |
| Structured/JSON AI output | ✅ | `response_format: json_object` + defensive parsing in `aiService.js` |
| Handles AI failures/rate limits/hallucinations | ✅ | retry-with-backoff on 5xx, explicit 429 message, JSON-parse validation with a clear error if the model returns malformed output |
| Database (SQL/NoSQL) | ✅ | SQLite (`better-sqlite3`) |
| Persist state across refresh | ✅ | every stage/approval is written to SQLite immediately, not kept only in React state |
| API keys not committed | ✅ | `.env` is gitignored; `.env.example` has placeholders only |
| README + `.env.example` | ✅ | this file |
| Architecture summary | ✅ | see "Architecture decisions" below |

## The flow (matches the Figma)

1. **Welcome screen** — chat-style entry point
2. **Create a project** — name it, then describe the requirement/context (file/Jira/Confluence sources are shown as disabled tiles — out of scope per the assignment's scope note)
3. **Generation options** — choose whether to generate Test Cases and/or User Stories, then hit Generate
4. **Step 1 — review Workflows** (AI-generated functional groupings) → approve
5. **Step 2 — review Rules** (business rules per workflow) → approve, with a "mark as explicit" action
6. **Step 3 — review User Stories** (derived from the rules) → approve
7. **Step 4 — review Test Cases** (derived from the user stories; positive/negative/edge_case/validation) → **view, edit inline, approve/reject**, or hit **Regenerate** to re-prompt the AI if the batch isn't good enough
8. **Export** — download approved test cases as CSV (Excel-openable). "Export to WM repo" is shown but disabled — that's an internal system integration, out of scope.

Each approval gate is enforced server-side: the project's `stage` only advances once every item at the current stage is approved.

## Stack

- **Frontend:** React (Vite), plain components, no UI framework
- **Backend:** Node.js + Express, **MVC layout**
- **Database:** SQLite via `better-sqlite3`
- **AI:** Groq's free, OpenAI-compatible chat completions API — one call per project returns the full Workflows→Rules→UserStories→TestCases JSON tree, validated and normalized before insertion. Chosen for its generous free tier and fast inference (no card required to get a key).

## Project structure

```
test-case-generator/
├── backend/
│   ├── src/
│   │   ├── db/index.js                    # schema: projects, workflows, rules, user_stories, test_cases
│   │   ├── models/
│   │   │   ├── Project.js
│   │   │   ├── Workflow.js
│   │   │   ├── Rule.js
│   │   │   ├── UserStory.js
│   │   │   └── TestCase.js                # SQL + serialization, one model per table
│   │   ├── controllers/
│   │   │   ├── projectsController.js       # create/list/get, options, generate
│   │   │   ├── reviewController.js         # bulk approve/reject at each gate, advances project.stage
│   │   │   └── exportController.js         # CSV export of approved test cases
│   │   ├── routes/projects.js              # thin route → controller mappings
│   │   ├── services/aiService.js           # Groq API call, prompt, JSON validation
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── WelcomeScreen.jsx
    │   │   ├── ProjectSetup.jsx            # name + context steps
    │   │   ├── GenerateOptionsForm.jsx      # Test Design Optimization step
    │   │   ├── ReviewList.jsx               # generic approve/reject list, reused for all 4 gates
    │   │   ├── ExportPanel.jsx
    │   │   └── ChatLog.jsx                  # system message log, chat-style
    │   ├── api.js
    │   ├── App.jsx                          # screen/stage state machine
    │   └── index.css
    ├── vite.config.js
    └── package.json
```

## Setup & running locally

### Prerequisites
- Node.js 18+
- A Groq API key (https://console.groq.com/keys — free, no card required)

### 1. Backend
```bash
cd backend
cp .env.example .env
# edit .env and set GROQ_API_KEY=gsk_...
npm install
npm run dev
```
API starts on `http://localhost:5000`. SQLite file is created automatically at `backend/data/app.db`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to port 5000.

### 3. Try it
1. Click the welcome prompt to start.
2. Enter a project name, then describe a requirement (e.g. *"Users should be able to reset their password via a link emailed to them, valid for 30 minutes."*)
3. Pick generation options and click **Generate**.
4. Step through **Workflows → Rules → User Stories → Test Cases**, using "Approve all & continue" (or select individual items and approve/reject in bulk).
5. On the final screen, **Export as Excel (CSV)**.

The app follows the Figma exactly — there's no project switcher or "new project" button, since neither the design nor the assignment brief calls for one (the assignment's own scope note says to ignore auxiliary screens). The current project is remembered across a browser refresh via `localStorage`. **To test a second requirement**, either open a new incognito/private window, or clear the browser's `localStorage` key `tcg_project_id` for `localhost:5173` (DevTools → Application → Local Storage).

## Architecture decisions

- **Backend layering (MVC):** `models/` own all SQL + serialization; `controllers/` hold request handling, validation, and orchestration (including calling `aiService`); `routes/` are pure mappings. `services/aiService.js` sits outside the triad — it's an external integration, not app data or a request handler.
- **Data model mirrors the pipeline:** `projects` → `workflows` → `rules` / `user_stories` / `test_cases`, with `user_stories.rule_id` and `test_cases.user_story_id` tracing provenance back up the chain (so a test case can be traced to the user story, rule, and workflow it came from — matching the Figma's hierarchy).
- **One AI call per generation, not four:** the real product likely chains separate calls for workflows → rules → user stories → test cases. To fit the 2–3 day scope, this build asks the model for the full tree in one structured-JSON call (with index-based references between levels), then the review gates are purely local approve/reject state — no AI is re-invoked at each gate. Regenerating at any single gate would be the natural next step.
- **Empty stages are skipped, not dead-ended:** if the user opts out of generating User Stories (or Test Cases), that review gate would have zero items and the old "approve all to continue" contract could never be satisfied. `advanceStage()` in `reviewController.js` walks forward to the next stage that actually has items, so every combination of the two checkboxes produces a completable pipeline.
- **The pipeline is navigable both ways:** `project.stage` on the server only ever moves forward (it's the record of real progress, and it's what a page refresh restores). On top of that, the frontend keeps its own `viewStage` — clicking an earlier tab in `StageNav.jsx` lets the person go back and re-review or edit anything already approved (including test cases, via the same inline edit form) without touching server-side progress. Approving/rejecting from a past tab snaps the view back to the real current stage afterward, since the underlying data just changed.
- **Stage machine lives on the server:** `projects.stage` (`draft → workflows → rules → user_stories → test_cases → export → exported`) only advances when every item at the current stage is `approved`, so a client refresh or a second reviewer always sees the correct gate.
- **Out of scope, by the assignment's own scope note:** the knowledge graph, multi-project switcher, and Jira/Confluence/SharePoint/Teams/Azure source integrations are shown in the Figma but are enterprise auxiliary features outside the "Test Case Generation" flow — the UI shows those source tiles as disabled rather than omitting them silently, so the mapping to the design is still visible.

## Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Express port (default `5000`) |
| `GROQ_API_KEY` | Your Groq API key — never commit this |
| `GROQ_MODEL` | Groq model id (default `openai/gpt-oss-120b`) |
| `DB_PATH` | SQLite file path (default `./data/app.db`) |

## Known trade-offs / what I'd add with more time

- No auth/multi-user support.
- No automated tests (Jest/Supertest, RTL) given the timeline.
- Rejected items currently stay in the list with a "rejected" pill rather than being regenerated — a "regenerate this item" action per gate would be the natural follow-up.
- "Export to WM repo" is a stub (disabled) since it depends on an internal system not described in the assignment.
