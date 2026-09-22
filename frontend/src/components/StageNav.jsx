const STAGE_LABELS = {
  workflows: 'Workflows',
  rules: 'Rules',
  user_stories: 'User Stories',
  test_cases: 'Test Cases',
  export: 'Export',
};

export default function StageNav({ stages, activeStage, currentStage, onSelect }) {
  if (stages.length < 2) return null;

  const currentIndex = stages.indexOf(currentStage);

  return (
    <nav className="stage-nav" aria-label="Pipeline stages">
      {stages.map((stage, i) => {
        const reached = i <= currentIndex;
        const isActive = stage === activeStage;
        return (
          <button
            key={stage}
            type="button"
            className={`stage-nav__item${isActive ? ' stage-nav__item--active' : ''}${reached ? '' : ' stage-nav__item--locked'}`}
            disabled={!reached}
            onClick={() => onSelect(stage)}
          >
            <span className="stage-nav__index">{i + 1}</span>
            {STAGE_LABELS[stage]}
          </button>
        );
      })}
    </nav>
  );
}
