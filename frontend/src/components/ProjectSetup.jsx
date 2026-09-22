import { useState } from 'react';

export default function ProjectSetup({ onSubmit, onCancel, isLoading }) {
  const [step, setStep] = useState('name');
  const [name, setName] = useState('');
  const [contextText, setContextText] = useState('');

  function handleNameContinue(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setStep('context');
  }

  function handleContextContinue(e) {
    e.preventDefault();
    if (!contextText.trim()) return;
    onSubmit(name.trim(), contextText.trim());
  }

  if (step === 'name') {
    return (
      <div className="setup-card">
        <p className="assistant-line">I'm creating a new project for testcase generation, Please enter a name for your project.</p>
        <form onSubmit={handleNameContinue} className="setup-form">
          <input
            type="text"
            placeholder="Enter Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={!name.trim()}>Continue</button>
        </form>
      </div>
    );
  }

  return (
    <div className="setup-card">
      <p className="assistant-line">What other context you want me to consider for creating the testcases.</p>
      <div className="associate-context">
        <h3>Associate Context</h3>
        <label className="context-label">Describe the context</label>
        <form onSubmit={handleContextContinue}>
          <textarea
            rows={6}
            placeholder="e.g. As a user, I want to reset my password via email so that I can regain access to my account if I forget it."
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            autoFocus
          />
          <div className="setup-form__footer">
            <button type="button" className="secondary" onClick={onCancel} disabled={isLoading}>Cancel</button>
            <button type="submit" disabled={isLoading || !contextText.trim()}>Continue</button>
          </div>
        </form>
      </div>
    </div>
  );
}
