const BASE_URL = '/api';

async function handleResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed with status ${res.status}`);
    err.code = data.code;
    throw err;
  }
  return data;
}

export const listProjects = () => fetch(`${BASE_URL}/projects`).then(handleResponse);

export const getProject = (id) => fetch(`${BASE_URL}/projects/${id}`).then(handleResponse);

export const createProject = (name, contextText) =>
  fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, contextText }),
  }).then(handleResponse);

export const updateProjectOptions = (id, options) =>
  fetch(`${BASE_URL}/projects/${id}/options`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  }).then(handleResponse);

export const generateHierarchy = (id) =>
  fetch(`${BASE_URL}/projects/${id}/generate`, { method: 'POST' }).then(handleResponse);

// Regenerate reuses the same endpoint — the backend wipes and rebuilds the
// hierarchy, which is what makes it safe to call more than once.
export const regenerateHierarchy = generateHierarchy;

export const updateTestCase = (id, payload) =>
  fetch(`${BASE_URL}/test-cases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const bulkStatus = (projectId, kind, ids, status) =>
  fetch(`${BASE_URL}/projects/${projectId}/${kind}/bulk-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, status }),
  }).then(handleResponse);

export const markRulesExplicit = (projectId, ids) =>
  fetch(`${BASE_URL}/projects/${projectId}/rules/mark-explicit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  }).then(handleResponse);

export const exportCsvUrl = (projectId) => `${BASE_URL}/projects/${projectId}/export/csv`;
