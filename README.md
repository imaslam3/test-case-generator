# AI Test Case Generator

This is my submission for the Esperia Studio Full-Stack AI Developer assessment.

It's a web app where you give it a requirement (like a user story or feature description), and it uses AI to generate test cases for it — including positive, negative, edge case, and validation scenarios. You can then review, edit, approve, and export them.

## What I built

I followed the Figma design and the assignment brief, and focused on the "Test Case Generation" flow only, since the brief said to ignore the other menu items.

The flow works like this:

1. Start a new project and give it a name.
2. Paste in your requirement/context (I went with a plain text box — simplest way to get the requirement in).
3. Choose whether you want Test Cases, User Stories, or both, then hit Generate.
4. The AI breaks it down into **Workflows → Rules → User Stories → Test Cases**. I did it this way instead of just generating a flat list of test cases, because it mirrors how a QA person would actually think about a requirement, and it means every test case can be traced back to where it came from.
5. You review and approve each stage one at a time — Workflows first, then Rules, then User Stories, then Test Cases.
6. At the Test Cases stage you can view them, edit them inline, and save your changes.
7. If you're not happy with a batch, there's a Regenerate button that re-prompts the AI.
8. Once everything's approved, you can export the test cases as a CSV file.

I also added a way to go back and look at (or edit) an earlier stage even after you've moved past it — there's a small tab bar at the top for that. It doesn't mess with your actual progress; it's just a way to look back.

## Tech I used

- **Frontend:** React (with Vite), no UI framework, just plain components
- **Backend:** Node.js + Express
- **Database:** SQLite (using `better-sqlite3`) — simple, no separate server to run, good enough for this scope
- **AI:** Groq's API (free tier, model: `openai/gpt-oss-120b`). I picked Groq mainly because it's free and fast, and it supports forcing JSON output which made parsing a lot more reliable.

## How I organized the backend

I kept it in a fairly standard MVC-ish layout:

- `models/` — talks to the database, one file per table
- `controllers/` — handles requests, validation, and decides what happens
- `routes/` — just maps URLs to controller functions, nothing else
- `services/aiService.js` — the actual call to Groq, plus the prompt and the JSON parsing/validation. I kept this separate from the controllers since it's really an external integration, not app logic.

## Database structure

Five tables: `projects`, `workflows`, `rules`, `user_stories`, `test_cases`. Each one links back to the one above it (a test case points to the user story it came from, which points to the rule, which points to the workflow). This way you can always trace a test case back to why it exists.

There's also a `stage` field on the project (draft → workflows → rules → user_stories → test_cases → export) that only moves forward once everything at that stage is approved. That's checked on the server, not just in the React state, so refreshing the page or losing your place never breaks anything.

## A few decisions I made where the brief left things open

- **One AI call instead of four separate ones.** The "proper" way might be to call the AI separately for workflows, then rules, then stories, then test cases. Given the 2–3 day timeline, I asked for the whole tree in a single structured JSON response instead, with index-based references linking each level together. The review/approval part is all local after that — no extra AI calls per stage.
- **If you skip generating User Stories or Test Cases**, that stage just gets skipped in the review flow instead of getting stuck on an empty screen.
- **Going back to an earlier stage** doesn't rewind your actual progress on the server — it's just a local "what am I looking at right now" view. Your real progress is always what gets restored on refresh.
- Things like the knowledge graph, multi-project switcher, and the Jira/Confluence/Teams/Azure source tiles are in the Figma but outside the scope note, so I left them visible but disabled rather than deleting them — just to show I saw them and made a call.

## Handling AI failures

- If Groq is slow or throws a 5xx, it retries a couple of times with backoff.
- If you hit the free-tier rate limit, you get a clear message instead of a generic error.
- If the model returns something that isn't valid JSON (it does happen sometimes), that gets caught and reported instead of crashing the app.
- If the model ID in your `.env` isn't valid anymore (Groq deprecates models occasionally), you get a message telling you to update `GROQ_MODEL`.

## Running it locally

You'll need Node.js 18+ and a free Groq API key from https://console.groq.com/keys (no card needed).

**Backend:**
```bash
cd backend
cp .env.example .env
# open .env and paste your GROQ_API_KEY in
npm install
npm run dev
```
This runs on `http://localhost:5000` and creates the SQLite file automatically.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Then open `http://localhost:5173`.

**To try it out:**
1. Click through the welcome screen.
2. Name a project, then paste a requirement — something like: *"Users should be able to reset their password via a link emailed to them, valid for 30 minutes."*
3. Pick what to generate and hit Generate.
4. Go through Workflows → Rules → User Stories → Test Cases, approving as you go.
5. Export the test cases as CSV at the end.

If you want to try a second requirement, either open an incognito window, or clear the `tcg_project_id` key from your browser's local storage — the app doesn't have a "start new project" button since it wasn't in the design.

## `.env` variables

| Variable | What it's for |
|---|---|
| `PORT` | Which port the backend runs on (default 5000) |
| `GROQ_API_KEY` | Your Groq key — don't commit this |
| `GROQ_MODEL` | Which Groq model to use (default `openai/gpt-oss-120b`) |
| `DB_PATH` | Where the SQLite file gets created |

## What I'd do with more time

- Add proper tests (I didn't have time to set up Jest/RTL given the 2–3 day window)
- Auth / multi-user support — right now it's single-user, no login
- A way to regenerate just one rejected item instead of the whole batch
- Hook up the "Export to WM repo" button — right now it's just a disabled stub since it depends on an internal system I don't have details on

## Quick checklist against the brief

- Text input for requirements — done
- AI-powered generation covering positive/negative/edge case/validation — done
- View, edit, save, regenerate test cases — done
- React frontend, Node/Express backend — done
- Structured JSON output from the AI, with error/rate-limit handling — done
- Data persists in SQLite, survives a refresh — done
- `.env` not committed, `.env.example` provided — done
