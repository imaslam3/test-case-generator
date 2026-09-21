require('dotenv').config();
const express = require('express');
const cors = require('cors');

const projectsRouter = require('./routes/projects');
const testCasesRouter = require('./routes/testCases');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/projects', projectsRouter);
app.use('/api/test-cases', testCasesRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Test Case Generator API listening on port ${PORT}`);
});
