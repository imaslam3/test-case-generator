const express = require('express');
const testCasesController = require('../controllers/testCasesController');

const router = express.Router();

router.put('/:id', testCasesController.update);

module.exports = router;
