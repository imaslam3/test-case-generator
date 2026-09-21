import { useState } from 'react';

export default function GenerateOptionsForm({ onGenerate, isLoading }) {
  const [generateTestCases, setGenerateTestCases] = useState(true);
  const [generateUserStories, setGenerateUserStories] = useState(true);

  function handleSubmit(e) {
    e.preventDefault();
    onGenerate({ generateTestCases, generateUserStories });
  }

  return (
    <div className="options-card">
      <form onSubmit={handleSubmit}>
        <p className="assistant-line">
          Choose the output you'd like to generate:{' '}
          <label className="inline-check">
            <input type="checkbox" checked={generateTestCases} onChange={(e) => setGenerateTestCases(e.target.checked)} /> Test Cases
          </label>{' '}
          and{' '}
          <label className="inline-check">
            <input type="checkbox" checked={generateUserStories} onChange={(e) => setGenerateUserStories(e.target.checked)} /> User Stories
          </label>
        </p>

        <div className="setup-form__footer">
          <button type="submit" disabled={isLoading || (!generateTestCases && !generateUserStories)}>
            {isLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </form>
    </div>
  );
}
