import { useState } from 'react';

export default function WelcomeScreen({ onStart }) {
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onStart(value.trim());
  }

  return (
    <div className="welcome-screen">
      <h1>Welcome to the world of Test Case Generation.</h1>
      <p>What would you like to done today?</p>
      <form onSubmit={handleSubmit} className="prompt-bar">
        <input
          type="text"
          placeholder="What would you like to do today?"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit">→</button>
      </form>
    </div>
  );
}
