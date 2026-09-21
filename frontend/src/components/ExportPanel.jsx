export default function ExportPanel({ testCaseCount, exportUrl }) {
  if (testCaseCount === 0) {
    return (
      <div className="export-panel">
        <p className="assistant-line">
          There are no approved test cases to export. Use Regenerate, or start a new project with
          "Test Cases" selected.
        </p>
      </div>
    );
  }

  return (
    <div className="export-panel">
      <p className="assistant-line">All {testCaseCount} test cases are approved. Export the test cases.</p>
      <div className="export-actions">
        <a className="button-link" href={exportUrl} download>
          Export as Excel (CSV)
        </a>
      </div>
    </div>
  );
}
