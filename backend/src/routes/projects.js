const express = require('express');
const projectsController = require('../controllers/projectsController');
const reviewController = require('../controllers/reviewController');
const exportController = require('../controllers/exportController');

const router = express.Router();

router.get('/', projectsController.list);
router.get('/:id', projectsController.getOne);
router.post('/', projectsController.create);
router.put('/:id/options', projectsController.updateOptions);
router.post('/:id/generate', projectsController.generate);
router.delete('/:id', projectsController.remove);

router.post('/:id/workflows/bulk-status', reviewController.bulkWorkflows);
router.post('/:id/rules/bulk-status', reviewController.bulkRules);
router.post('/:id/rules/mark-explicit', reviewController.markRulesExplicit);
router.post('/:id/user-stories/bulk-status', reviewController.bulkUserStories);
router.post('/:id/test-cases/bulk-status', reviewController.bulkTestCases);

router.get('/:id/export/csv', exportController.exportCsv);

module.exports = router;
